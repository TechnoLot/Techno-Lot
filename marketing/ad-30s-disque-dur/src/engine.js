// Moteur de rendu « cinéma » : chaque image est la moyenne de N sous-images.
// Chaque sous-image décale le temps (obturateur 180° → flou de bougé), la position
// de la caméra sur la pupille (profondeur de champ optique, plan de netteté fixe)
// et le cadrage d'une fraction de pixel (anticrénelage). Le tout s'accumule en
// flottant, puis passe une seule fois en post-traitement (halo, étalonnage, grain).
import * as THREE from "three";
import { halton } from "./ease.js";

const QUAD_VS = /* glsl */ `
varying vec2 vUv;
void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;

// Accumulation : une scène, ou deux scènes composées par un masque (transitions)
const ACCUM_FS = /* glsl */ `
uniform sampler2D tA, tB;
uniform int mode;          // 0 : A seul · 1 : iris (B dans le cercle) · 2 : fondu · 3 : volet horizontal
uniform vec4 p;            // paramètres du masque (centre en uv, rayon en px, adoucissement px)
uniform vec2 res;
uniform float w;
varying vec2 vUv;
void main() {
  vec3 a = texture2D(tA, vUv).rgb;
  vec3 c = a;
  if (mode == 1) {
    float r = length((vUv - p.xy) * res);
    c = mix(a, texture2D(tB, vUv).rgb, 1.0 - smoothstep(p.z - p.w, p.z + p.w, r));
  } else if (mode == 2) {
    c = mix(a, texture2D(tB, vUv).rgb, p.x);
  } else if (mode == 3) {
    float x = vUv.x * res.x;
    c = mix(a, texture2D(tB, vUv).rgb, smoothstep(p.x - p.y, p.x + p.y, x));
  }
  // garde-fou : un seul NaN/Inf contaminerait tout le halo (rectangles noirs)
  if (any(isnan(c)) || any(isinf(c))) c = vec3(0.0);
  gl_FragColor = vec4(min(c, vec3(256.0)) * w, 1.0);
}`;

// Halo : pré-filtre à seuil doux, puis chaîne de mip descendante / montante
const PREFILTER_FS = /* glsl */ `
uniform sampler2D tSrc; uniform float threshold, knee; uniform vec2 texel;
varying vec2 vUv;
void main() {
  vec3 c = vec3(0.0);
  c += texture2D(tSrc, vUv + texel * vec2(-1.0, -1.0)).rgb;
  c += texture2D(tSrc, vUv + texel * vec2( 1.0, -1.0)).rgb;
  c += texture2D(tSrc, vUv + texel * vec2(-1.0,  1.0)).rgb;
  c += texture2D(tSrc, vUv + texel * vec2( 1.0,  1.0)).rgb;
  c *= 0.25;
  float br = max(c.r, max(c.g, c.b));
  float soft = clamp(br - threshold + knee, 0.0, 2.0 * knee);
  soft = soft * soft / (4.0 * knee + 1e-4);
  float contrib = max(soft, br - threshold) / max(br, 1e-4);
  gl_FragColor = vec4(c * contrib, 1.0);
}`;
const DOWN_FS = /* glsl */ `
uniform sampler2D tSrc; uniform vec2 texel;
varying vec2 vUv;
void main() {
  vec3 c = texture2D(tSrc, vUv).rgb * 0.5;
  c += texture2D(tSrc, vUv + texel * vec2(-1.0, -1.0)).rgb * 0.125;
  c += texture2D(tSrc, vUv + texel * vec2( 1.0, -1.0)).rgb * 0.125;
  c += texture2D(tSrc, vUv + texel * vec2(-1.0,  1.0)).rgb * 0.125;
  c += texture2D(tSrc, vUv + texel * vec2( 1.0,  1.0)).rgb * 0.125;
  gl_FragColor = vec4(c, 1.0);
}`;
const UP_FS = /* glsl */ `
uniform sampler2D tSrc, tPrev; uniform vec2 texel; uniform float radius;
varying vec2 vUv;
void main() {
  vec2 o = texel * radius;
  vec3 c = texture2D(tSrc, vUv).rgb * 4.0;
  c += texture2D(tSrc, vUv + vec2(-o.x, 0.0)).rgb * 2.0;
  c += texture2D(tSrc, vUv + vec2( o.x, 0.0)).rgb * 2.0;
  c += texture2D(tSrc, vUv + vec2(0.0, -o.y)).rgb * 2.0;
  c += texture2D(tSrc, vUv + vec2(0.0,  o.y)).rgb * 2.0;
  c += texture2D(tSrc, vUv + vec2(-o.x, -o.y)).rgb;
  c += texture2D(tSrc, vUv + vec2( o.x, -o.y)).rgb;
  c += texture2D(tSrc, vUv + vec2(-o.x,  o.y)).rgb;
  c += texture2D(tSrc, vUv + vec2( o.x,  o.y)).rgb;
  gl_FragColor = vec4(c / 16.0 + texture2D(tPrev, vUv).rgb, 1.0);
}`;

// Passe finale : aberration chromatique, halo, exposition, écrêtage doux qui
// préserve la teinte, vignette, encodage sRGB, grain, puis remappage de la plage
// [0, 1] sur la palette stricte : noir #050505 → blanc cassé #F2F2EE.
const FINAL_FS = /* glsl */ `
uniform sampler2D tAccum, tBloom;
uniform vec2 res;
uniform float exposure, bloom, vignette, ca, grain, frame, flash, lift;
uniform vec3 blackPt, whitePt;
varying vec2 vUv;
float hash12(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
float srgb(float x) { return x <= 0.0031308 ? 12.92 * x : 1.055 * pow(x, 1.0 / 2.4) - 0.055; }
vec3 softClip(vec3 c) {
  // identité jusqu'à 1 (les couleurs « à plat » de la palette sortent exactes),
  // au-delà : écrêtage qui préserve la teinte et tire les très hautes lumières vers le blanc
  float m = max(c.r, max(c.g, c.b));
  if (m <= 1.0) return c;
  return mix(c / m, vec3(1.0), smoothstep(1.0, 5.0, m));
}
void main() {
  vec2 uv = vUv, d = uv - 0.5;
  vec2 off = d * ca * dot(d, d);
  vec3 c = vec3(texture2D(tAccum, uv - off).r, texture2D(tAccum, uv).g, texture2D(tAccum, uv + off).b);
  c += texture2D(tBloom, uv).rgb * bloom;
  c = c * exposure + flash;
  c = softClip(c);
  float r = length(d * vec2(res.x / res.y, 1.0));
  c *= 1.0 - vignette * smoothstep(0.35, 1.05, r);
  vec3 s = vec3(srgb(c.r), srgb(c.g), srgb(c.b));
  // Grain argentique : deux échelles, plus présent dans les tons moyens
  vec2 q = uv * res;
  float g = hash12(q + frame * 17.0) + hash12(floor(q * 0.5) + frame * 31.0) - 1.0;
  float lum = dot(s, vec3(0.2126, 0.7152, 0.0722));
  s += g * grain * (0.35 + 0.65 * (1.0 - abs(lum * 2.0 - 1.0)));
  s = s * (1.0 - lift) + lift;
  s = blackPt + clamp(s, 0.0, 1.0) * (whitePt - blackPt);
  s += (hash12(q + 0.5 + frame) - 0.5) / 255.0; // tramage anti-bandes
  gl_FragColor = vec4(s, 1.0);
}`;

export class Engine {
  constructor(canvas, W, H) {
    this.W = W;
    this.H = H;
    const r = (this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: false,
      alpha: false,
      stencil: false,
      preserveDrawingBuffer: true,
      powerPreference: "high-performance",
    }));
    r.setPixelRatio(1);
    r.setSize(W, H, false);
    r.outputColorSpace = THREE.LinearSRGBColorSpace; // l'encodage sRGB est fait dans FINAL_FS
    r.toneMapping = THREE.NoToneMapping;
    r.shadowMap.enabled = true;
    r.shadowMap.type = THREE.PCFSoftShadowMap;
    r.localClippingEnabled = true;
    r.autoClear = false; // effacements explicites : l’accumulation additionne les sous-images

    const target = (w, h, o = {}) =>
      new THREE.WebGLRenderTarget(w, h, {
        type: THREE.HalfFloatType,
        minFilter: THREE.LinearFilter,
        magFilter: THREE.LinearFilter,
        depthBuffer: false,
        ...o,
      });
    this.rtA = target(W, H, { depthBuffer: true, samples: 4 });
    this.rtB = target(W, H, { depthBuffer: true, samples: 4 });
    this.accum = target(W, H, { type: THREE.FloatType });
    this.levels = [];
    let w = W, h = H;
    for (let i = 0; i < 7; i++) {
      w = Math.max(1, w >> 1);
      h = Math.max(1, h >> 1);
      this.levels.push({ down: target(w, h), up: target(w, h), w, h });
    }
    this.black = target(1, 1);
    r.setRenderTarget(this.black);
    r.setClearColor(0x000000, 1);
    r.clear();

    this.quadScene = new THREE.Scene();
    this.quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2));
    this.quad.frustumCulled = false;
    this.quadScene.add(this.quad);

    const mat = (fs, uniforms, extra = {}) =>
      new THREE.ShaderMaterial({ vertexShader: QUAD_VS, fragmentShader: fs, uniforms, depthTest: false, depthWrite: false, ...extra });
    this.accumMat = mat(
      ACCUM_FS,
      { tA: { value: null }, tB: { value: null }, mode: { value: 0 }, p: { value: new THREE.Vector4() }, res: { value: new THREE.Vector2(W, H) }, w: { value: 1 } },
      { blending: THREE.CustomBlending, blendEquation: THREE.AddEquation, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor }
    );
    this.prefilterMat = mat(PREFILTER_FS, { tSrc: { value: null }, threshold: { value: 1 }, knee: { value: 0.5 }, texel: { value: new THREE.Vector2() } });
    this.downMat = mat(DOWN_FS, { tSrc: { value: null }, texel: { value: new THREE.Vector2() } });
    this.upMat = mat(UP_FS, { tSrc: { value: null }, tPrev: { value: null }, texel: { value: new THREE.Vector2() }, radius: { value: 1 } });
    this.finalMat = mat(FINAL_FS, {
      tAccum: { value: this.accum.texture },
      tBloom: { value: null },
      res: { value: new THREE.Vector2(W, H) },
      exposure: { value: 1 },
      bloom: { value: 0.25 },
      vignette: { value: 0.25 },
      ca: { value: 0.006 },
      grain: { value: 0.035 },
      frame: { value: 0 },
      flash: { value: 0 },
      lift: { value: 0 },
      blackPt: { value: new THREE.Vector3(5 / 255, 5 / 255, 5 / 255) },
      whitePt: { value: new THREE.Vector3(242 / 255, 242 / 255, 238 / 255) },
    });
    this._right = new THREE.Vector3();
    this._up = new THREE.Vector3();
  }

  pass(material, target) {
    this.quad.material = material;
    this.renderer.setRenderTarget(target);
    this.renderer.render(this.quadScene, this.quadCam);
  }

  // Décale la caméra sur la pupille (profondeur de champ) et d'une fraction de pixel.
  // focus : distance de netteté (unités monde) ; aperture : rayon de la pupille.
  jitterCamera(cam, lu, lv, jx, jy, focus, aperture) {
    const rad = Math.sqrt(lu) * aperture, th = 2 * Math.PI * lv;
    const dx = rad * Math.cos(th), dy = rad * Math.sin(th);
    cam.updateMatrixWorld();
    this._right.setFromMatrixColumn(cam.matrixWorld, 0);
    this._up.setFromMatrixColumn(cam.matrixWorld, 1);
    cam.position.addScaledVector(this._right, dx).addScaledVector(this._up, dy);
    cam.updateMatrixWorld();
    const n = cam.near;
    const top = (n * Math.tan(THREE.MathUtils.DEG2RAD * 0.5 * cam.fov)) / cam.zoom;
    const height = 2 * top, width = cam.aspect * height;
    const left = -0.5 * width + (cam.filmOffset * n) / cam.getFilmWidth();
    const sx = (-dx * n) / focus + (jx * width) / this.W;
    const sy = (-dy * n) / focus + (jy * height) / this.H;
    cam.projectionMatrix.makePerspective(left + sx, left + width + sx, top + sy, top - height + sy, n, cam.far);
    cam.projectionMatrixInverse.copy(cam.projectionMatrix).invert();
  }

  // Rend l'image au temps t. director(ts) prépare la scène pour la sous-image ts et
  // renvoie { a: {scene, camera, focus, aperture}, b?, mode, p } ; post : réglages
  // de la passe finale pour l'image (exposition, halo, éclair…).
  renderFrame(t, frameIndex, director, { samples = 16, shutter = 0.5 / 30, post = {} } = {}) {
    const r = this.renderer;
    r.setRenderTarget(this.accum);
    r.setClearColor(0x000000, 1);
    r.clear(true, false, false);
    const base = (frameIndex * 7919) % 1000;
    for (let i = 0; i < samples; i++) {
      const k = base + i + 1;
      const ts = t + ((i + halton(k, 7)) / samples - 0.5) * shutter;
      const shot = director(ts);
      const draw = (view, rt) => {
        this.jitterCamera(view.camera, halton(k, 2), halton(k, 3), halton(k, 5) - 0.5, halton(k, 11) - 0.5, view.focus ?? 10, view.aperture ?? 0);
        r.setRenderTarget(rt);
        r.setClearColor(view.scene.userData.clear ?? 0x000000, 1);
        r.clear();
        r.render(view.scene, view.camera);
      };
      draw(shot.a, this.rtA);
      const u = this.accumMat.uniforms;
      u.tA.value = this.rtA.texture;
      u.mode.value = 0;
      if (shot.b && shot.mode) {
        draw(shot.b, this.rtB);
        u.tB.value = this.rtB.texture;
        u.mode.value = shot.mode;
        u.p.value.copy(shot.p);
      }
      u.w.value = 1 / samples;
      this.pass(this.accumMat, this.accum);
    }
    this.bloomChain(post.threshold ?? 1.0);
    const f = this.finalMat.uniforms;
    for (const key of ["exposure", "bloom", "vignette", "ca", "grain", "flash", "lift"]) if (post[key] !== undefined) f[key].value = post[key];
    f.frame.value = frameIndex % 4096;
    f.tBloom.value = this.levels[0].up.texture;
    this.pass(this.finalMat, null);
  }

  bloomChain(threshold) {
    const L = this.levels;
    this.prefilterMat.uniforms.tSrc.value = this.accum.texture;
    this.prefilterMat.uniforms.threshold.value = threshold;
    this.prefilterMat.uniforms.texel.value.set(1 / this.W, 1 / this.H);
    this.pass(this.prefilterMat, L[0].down);
    for (let i = 1; i < L.length; i++) {
      this.downMat.uniforms.tSrc.value = L[i - 1].down.texture;
      this.downMat.uniforms.texel.value.set(1 / L[i - 1].w, 1 / L[i - 1].h);
      this.pass(this.downMat, L[i].down);
    }
    // remontée : le plus petit niveau s'ajoute aux suivants
    let prev = this.black.texture;
    for (let i = L.length - 1; i >= 0; i--) {
      this.upMat.uniforms.tSrc.value = L[i].down.texture;
      this.upMat.uniforms.tPrev.value = prev;
      this.upMat.uniforms.texel.value.set(1 / L[i].w, 1 / L[i].h);
      this.upMat.uniforms.radius.value = 1.0;
      this.pass(this.upMat, L[i].up);
      prev = L[i].up.texture;
    }
  }
}
