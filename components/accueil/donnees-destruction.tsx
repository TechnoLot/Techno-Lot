"use client";

import { useEffect, useRef, useState } from "react";
import { Check } from "lucide-react";
import { PrimaryButtonLink } from "@/components/site/Button";
import type { AccueilContenu } from "./contenu";
import "./interactif.css";

// AVIF recompressé (1200 px, comme l'original : assez pour le plus grand affichage × densité 2)
const SRC = "/images/donnees/disque-dur.avif";
const SRC_WEBP = "/images/donnees/disque-dur.webp";
const STEP = 3; // taille d'une particule, en px CSS
const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));

/**
 * Destruction des données (chapitre bleu nuit) : le disque dur reste net, puis se dissout au
 * défilement ; chaque fragment qui se détache s'envole en virant au vert, et le certificat se
 * pose. Sans JS ou en mouvement réduit : le certificat est affiché d'emblée.
 */
export function DonneesDestruction({ labels, href }: { labels: AccueilContenu["donnees"]; href: string }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // Rendu serveur = état final (certificat visible) : rien n'est caché si le JS ne s'exécute pas.
  const [done, setDone] = useState(true);

  useEffect(() => {
    const track = trackRef.current;
    const box = boxRef.current;
    const canvas = canvasRef.current;
    if (!track || !box || !canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const img = new Image();
    img.decoding = "async";

    let dpr = 1;
    let n = 0;
    let cellW = STEP,
      cellH = STEP;
    let px = new Float32Array(0),
      py = new Float32Array(0),
      th = new Float32Array(0);
    let vx = new Float32Array(0),
      vy = new Float32Array(0);
    let cr = new Uint8ClampedArray(0),
      cg = new Uint8ClampedArray(0),
      cb = new Uint8ClampedArray(0),
      ca = new Uint8ClampedArray(0);
    let base: Uint8ClampedArray | null = null;
    let frameData: ImageData | null = null;
    // Image affichée, pour ne recopier que ce qui change (rendu identique au pixel près) :
    // nombre de fragments détachés qui recouvrent chaque pixel, fragments détachés, et fragments
    // en vol (position en px physiques, couleur telle qu'écrite dans l'ImageData), affichés / à venir.
    let cover = new Uint8Array(0);
    let gone = new Uint8Array(0);
    let chg = new Int32Array(0);
    let fly = new Uint8Array(0),
      nfly = new Uint8Array(0);
    let fx = new Int32Array(0),
      fy = new Int32Array(0),
      nfx = new Int32Array(0),
      nfy = new Int32Array(0);
    let fc = new Uint32Array(0),
      nfc = new Uint32Array(0);
    const q = new Uint8ClampedArray(4); // même arrondi que l'écriture dans l'ImageData
    let thMin = 0,
      thMax = 0;
    let painted = false; // faux : le canevas (vidé par build) doit être repeint en entier
    let drawnD = 0;
    let raf = 0;
    let visible = true;
    let De = 0;
    let shown = true;

    const progress = () => {
      const r = track.getBoundingClientRect();
      const P = clamp(-r.top / Math.max(1, r.height - window.innerHeight));
      return reduce ? 0 : clamp((P - 0.08) / 0.72);
    };
    const sync = (isDone: boolean) => {
      if (isDone !== shown) {
        shown = isDone;
        setDone(isDone);
      }
    };

    const build = () => {
      if (!img.complete || !img.naturalWidth) return;
      dpr = Math.min(2, window.devicePixelRatio || 1);
      const W = box.clientWidth;
      const H = box.clientHeight;
      if (!W || !H) return;
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      canvas.style.width = `${W}px`;
      canvas.style.height = `${H}px`;

      const imgW = Math.min(W * 0.86, (H * 0.7 * img.naturalWidth) / img.naturalHeight);
      const imgH = (imgW * img.naturalHeight) / img.naturalWidth;
      const imgX = (W - imgW) / 2;
      const imgY = (H - imgH) / 2;

      // image nette, à pleine résolution
      const full = document.createElement("canvas");
      full.width = canvas.width;
      full.height = canvas.height;
      const fctx = full.getContext("2d");
      if (!fctx) return;
      fctx.imageSmoothingQuality = "high";
      fctx.drawImage(img, imgX * dpr, imgY * dpr, imgW * dpr, imgH * dpr);
      base = fctx.getImageData(0, 0, full.width, full.height).data;

      // grille de fragments (couleur moyenne de chaque case)
      const sw = Math.max(1, Math.round(imgW / STEP));
      const sh = Math.max(1, Math.round(imgH / STEP));
      cellW = imgW / sw;
      cellH = imgH / sh;
      const small = document.createElement("canvas");
      small.width = sw;
      small.height = sh;
      const sctx = small.getContext("2d");
      if (!sctx) return;
      sctx.drawImage(img, 0, 0, sw, sh);
      const data = sctx.getImageData(0, 0, sw, sh).data;
      const idx: number[] = [];
      for (let i = 0; i < sw * sh; i++) if (data[i * 4 + 3] > 2) idx.push(i);
      n = idx.length;
      px = new Float32Array(n);
      py = new Float32Array(n);
      th = new Float32Array(n);
      vx = new Float32Array(n);
      vy = new Float32Array(n);
      cr = new Uint8ClampedArray(n);
      cg = new Uint8ClampedArray(n);
      cb = new Uint8ClampedArray(n);
      ca = new Uint8ClampedArray(n);
      idx.forEach((i, k) => {
        const x = i % sw,
          y = (i / sw) | 0;
        px[k] = imgX + x * cellW;
        py[k] = imgY + y * cellH;
        // la dissolution balaie le disque de gauche à droite, avec du grain
        // (tous les fragments ont fini leur vol avant D = 0.97, quand le certificat apparaît)
        th[k] = (x / sw) * 0.5 + Math.random() * 0.18;
        vx[k] = 0.4 + Math.random() * 1.2;
        vy[k] = 0.6 + Math.random() * 1.6;
        cr[k] = data[i * 4];
        cg[k] = data[i * 4 + 1];
        cb[k] = data[i * 4 + 2];
        ca[k] = data[i * 4 + 3];
      });
      frameData = ctx.createImageData(canvas.width, canvas.height);
      cover = new Uint8Array(canvas.width * canvas.height);
      gone = new Uint8Array(n);
      chg = new Int32Array(n);
      fly = new Uint8Array(n);
      nfly = new Uint8Array(n);
      fx = new Int32Array(n);
      fy = new Int32Array(n);
      nfx = new Int32Array(n);
      nfy = new Int32Array(n);
      fc = new Uint32Array(n);
      nfc = new Uint32Array(n);
      thMin = Infinity;
      thMax = -Infinity;
      for (let k = 0; k < n; k++) {
        thMin = Math.min(thMin, th[k]);
        thMax = Math.max(thMax, th[k]);
      }
      painted = false;
      // reprise à la position courante (pas de dissolution rejouée au chargement en milieu de page)
      if (!De) De = progress();
      kick();
    };

    const fillBlock = (
      buf: Uint8ClampedArray,
      cw: number,
      chh: number,
      x0: number,
      y0: number,
      x1: number,
      y1: number,
      r: number,
      g: number,
      b: number,
      a: number
    ) => {
      const xa = Math.max(0, x0),
        xb = Math.min(cw, x1),
        ya = Math.max(0, y0),
        yb = Math.min(chh, y1);
      for (let y = ya; y < yb; y++) {
        let o = (y * cw + xa) * 4;
        for (let x = xa; x < xb; x++, o += 4) {
          buf[o] = r;
          buf[o + 1] = g;
          buf[o + 2] = b;
          buf[o + 3] = a;
        }
      }
    };

    // 0 : aucun fragment détaché ; 2 : tous détachés et posés ; 1 : plage active
    const zone = (D: number) => (D <= thMin ? 0 : (D - thMax) / 0.28 >= 1 ? 2 : 1);

    const draw = (D: number) => {
      if (!frameData || !base) return;
      // hors de la plage active, l'image ne dépend pas de D : déjà affichée, rien à refaire
      if (painted && zone(D) !== 1 && zone(D) === zone(drawnD)) return;
      const nette = base;
      const buf = frameData.data;
      const cw = canvas.width,
        chh = canvas.height;
      if (!painted) {
        buf.set(nette);
        cover.fill(0);
        gone.fill(0);
        fly.fill(0);
      }
      // rectangle du canevas à recopier
      let dx0 = cw,
        dy0 = chh,
        dx1 = 0,
        dy1 = 0;
      // remet l'image nette (moins les trous) sur un rectangle, et l'ajoute à la copie
      const restore = (x0: number, y0: number, x1: number, y1: number) => {
        const xa = Math.max(0, x0),
          xb = Math.min(cw, x1),
          ya = Math.max(0, y0),
          yb = Math.min(chh, y1);
        if (xa >= xb || ya >= yb) return;
        dx0 = Math.min(dx0, xa);
        dy0 = Math.min(dy0, ya);
        dx1 = Math.max(dx1, xb);
        dy1 = Math.max(dy1, yb);
        for (let y = ya; y < yb; y++) {
          let p = y * cw + xa,
            o = p * 4;
          for (let x = xa; x < xb; x++, p++, o += 4) {
            if (cover[p]) {
              buf[o] = buf[o + 1] = buf[o + 2] = buf[o + 3] = 0;
            } else {
              buf[o] = nette[o];
              buf[o + 1] = nette[o + 1];
              buf[o + 2] = nette[o + 2];
              buf[o + 3] = nette[o + 3];
            }
          }
        }
      };
      // 1) fragments qui se détachent (trou dans l'image nette) ou se recollent depuis l'image affichée
      let nchg = 0;
      for (let k = 0; k < n; k++) {
        const g = D > th[k] ? 1 : 0;
        if (g === gone[k]) continue;
        gone[k] = g;
        chg[nchg++] = k;
        const xa = Math.max(0, Math.floor(px[k] * dpr)),
          xb = Math.min(cw, Math.ceil((px[k] + cellW) * dpr)),
          ya = Math.max(0, Math.floor(py[k] * dpr)),
          yb = Math.min(chh, Math.ceil((py[k] + cellH) * dpr));
        for (let y = ya; y < yb; y++) {
          let p = y * cw + xa;
          for (let x = xa; x < xb; x++, p++) cover[p] += g ? 1 : -1;
        }
      }
      // 2) fragments en vol, qui virent au vert du logo (#6bd63b) : position et couleur finales
      const size = Math.max(1, Math.round(STEP * dpr * 0.8));
      let moved = false;
      for (let k = 0; k < n; k++) {
        const t = clamp((D - th[k]) / 0.28);
        if (t <= 0 || t >= 1) {
          nfly[k] = 0;
          if (fly[k]) moved = true;
          continue;
        }
        const e = t * t;
        nfly[k] = 1;
        nfx[k] = Math.round((px[k] + vx[k] * e * 160) * dpr);
        nfy[k] = Math.round((py[k] - vy[k] * e * 190) * dpr);
        q[0] = cr[k] + (107 - cr[k]) * t;
        q[1] = cg[k] + (214 - cg[k]) * t;
        q[2] = cb[k] + (59 - cb[k]) * t;
        q[3] = ca[k] * (1 - t);
        nfc[k] = (q[0] | (q[1] << 8) | (q[2] << 16) | (q[3] << 24)) >>> 0;
        if (!fly[k] || nfx[k] !== fx[k] || nfy[k] !== fy[k] || nfc[k] !== fc[k]) moved = true;
      }
      drawnD = D;
      // mouvement sans effet sur les pixels : l'image affichée est déjà la bonne
      if (painted && !nchg && !moved) return;
      // 3) on efface les fragments en vol de l'image affichée et on met à jour les trous…
      for (let k = 0; k < n; k++) if (fly[k]) restore(fx[k], fy[k], fx[k] + size, fy[k] + size);
      for (let i = 0; i < nchg; i++) {
        const k = chg[i];
        restore(
          Math.floor(px[k] * dpr),
          Math.floor(py[k] * dpr),
          Math.ceil((px[k] + cellW) * dpr),
          Math.ceil((py[k] + cellH) * dpr)
        );
      }
      // … puis on redessine tous les fragments en vol, dans le même ordre
      for (let k = 0; k < n; k++) {
        if (!nfly[k]) continue;
        const x = nfx[k],
          y = nfy[k],
          c = nfc[k];
        const xa = Math.max(0, x),
          xb = Math.min(cw, x + size),
          ya = Math.max(0, y),
          yb = Math.min(chh, y + size);
        if (xa < xb && ya < yb) {
          dx0 = Math.min(dx0, xa);
          dy0 = Math.min(dy0, ya);
          dx1 = Math.max(dx1, xb);
          dy1 = Math.max(dy1, yb);
        }
        fillBlock(buf, cw, chh, x, y, x + size, y + size, c & 255, (c >>> 8) & 255, (c >>> 16) & 255, c >>> 24);
      }
      [fly, nfly] = [nfly, fly];
      [fx, nfx] = [nfx, fx];
      [fy, nfy] = [nfy, fy];
      [fc, nfc] = [nfc, fc];
      // 4) copie limitée au rectangle qui a changé (tout le canevas après build, qui l'a vidé)
      if (!painted) {
        painted = true;
        ctx.putImageData(frameData, 0, 0);
      } else if (dx0 < dx1 && dy0 < dy1) {
        ctx.putImageData(frameData, 0, 0, dx0, dy0, dx1 - dx0, dy1 - dy0);
      }
    };

    const frame = () => {
      raf = 0;
      if (!visible) return;
      const D = progress();
      if (!n) {
        // image pas encore prête : on tient seulement l'état du certificat à jour
        sync(reduce || D > 0.97);
        return;
      }
      De = reduce ? D : De + (D - De) * 0.12;
      draw(De);
      sync(reduce || De > 0.97);
      if (!reduce && Math.abs(D - De) > 0.0005) raf = requestAnimationFrame(frame);
    };
    const kick = () => {
      if (!raf && visible) raf = requestAnimationFrame(frame);
    };

    // état du certificat posé tout de suite selon la position de défilement
    sync(reduce || progress() > 0.97);

    img.onload = build;
    // navigateur sans AVIF : on se rabat une fois sur le WebP d'origine
    img.onerror = () => {
      if (img.src.endsWith(SRC)) img.src = SRC_WEBP;
    };
    const ro = new ResizeObserver(build);
    ro.observe(box);
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      kick();
    });
    io.observe(track);
    // image demandée à l'approche de la section (1,5 écran d'avance) pour être prête avant d'être vue ;
    // tant qu'elle manque, frame() ne tient que l'état du certificat à jour
    const near = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return;
        near.disconnect();
        img.src = SRC;
      },
      { rootMargin: "150% 0px" }
    );
    near.observe(track);
    window.addEventListener("scroll", kick, { passive: true });

    return () => {
      cancelAnimationFrame(raf);
      img.onload = null;
      img.onerror = null;
      ro.disconnect();
      io.disconnect();
      near.disconnect();
      window.removeEventListener("scroll", kick);
    };
  }, []);

  return (
    <section data-theme="night" aria-labelledby="donnees-titre" className="relative text-mist">
      <div ref={trackRef} className="relative h-[220vh] motion-reduce:h-auto lg:h-[240vh] motion-reduce:lg:h-auto">
        <div className="sticky top-0 h-[100svh] min-h-[620px] overflow-hidden motion-reduce:static motion-reduce:h-auto">
          <div className="mx-auto grid h-full w-full max-w-6xl grid-rows-[auto_1fr] gap-6 px-5 pb-8 pt-[calc(var(--site-header-h)+1.25rem)] motion-reduce:py-20 sm:px-8 lg:grid-cols-12 lg:grid-rows-1 lg:items-center lg:gap-12 lg:pt-[calc(var(--site-header-h)+1.5rem)]">
            <div className="lg:col-span-5">
              <h2
                id="donnees-titre"
                className="text-balance font-display text-[clamp(2rem,4.4vw,3.6rem)] font-bold leading-[1.02] tracking-[-0.03em] text-mist"
              >
                {labels.title}
              </h2>
              <p className="mt-4 max-w-md text-sm leading-relaxed text-moss sm:text-base lg:mt-6 lg:text-lg">{labels.text}</p>
              <ul className="mt-6 hidden space-y-2.5 sm:block">
                {labels.bullets.map((point) => (
                  <li key={point} className="flex items-center gap-3 text-sm font-medium text-mist sm:text-base">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-vivid/15">
                      <Check className="h-3.5 w-3.5 text-vivid" strokeWidth={3} aria-hidden="true" />
                    </span>
                    {point}
                  </li>
                ))}
              </ul>
              <PrimaryButtonLink href={href} className="mt-6 lg:mt-8">
                {labels.cta}
              </PrimaryButtonLink>
            </div>

            <div className="donnees-scene relative min-h-0 motion-reduce:h-[50svh] lg:col-span-7 lg:h-[min(70svh,620px)]">
              <div ref={boxRef} aria-hidden="true" className="absolute inset-0">
                <canvas
                  ref={canvasRef}
                  className={`absolute left-0 top-0 transition-opacity duration-500 ${done ? "opacity-0" : "opacity-100"}`}
                />
              </div>
              <Certificat done={done} title={labels.certificateTitle} note={labels.certificateText} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/** Sceau : rosette dentelée (48 pointes) dans un carré de 100. */
const SCEAU = Array.from({ length: 48 }, (_, i) => {
  const a = (i / 48) * Math.PI * 2;
  const r = i % 2 ? 45 : 50;
  return `${(50 + Math.cos(a) * r).toFixed(2)},${(50 + Math.sin(a) * r).toFixed(2)}`;
}).join(" ");

/** Lignes de texte simulées (largeurs), sans texte lisible. */
const LIGNES = ["100%", "94%", "97%", "62%"];

/**
 * Le certificat, une vraie feuille : papier blanc légèrement incliné, bande verte en tête,
 * lignes simulées, champs, signature et sceau vert. Il se pose une fois le disque dissous.
 * Toutes les mesures internes suivent la largeur de la feuille (unités cqw).
 */
function Certificat({ done, title, note }: { done: boolean; title: string; note: string }) {
  return (
    <div
      className={`donnees-cert pointer-events-none absolute left-1/2 top-1/2 transition-[opacity,transform] duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none ${
        done
          ? "opacity-100 [transform:translate(-50%,-50%)_rotate(-3deg)]"
          : "opacity-0 [transform:translate(-50%,-42%)_rotate(-8deg)_scale(0.94)]"
      }`}
    >
      <div
        data-theme="light"
        className="donnees-paper relative aspect-[8.5/11] overflow-hidden rounded-[3px] shadow-[0_44px_80px_-34px_rgba(0,0,0,0.85),0_2px_6px_rgba(0,0,0,0.3)]"
      >
        <span aria-hidden="true" className="absolute inset-x-0 top-0 h-[2.4cqw] bg-leaf" />
        {/* Contenu dans un calque : les cqw se rapportent à la feuille, pas à la scène */}
        <div className="absolute inset-0 px-[9cqw] pt-[11cqw]">
          <p className="font-display text-[length:6.8cqw] font-bold leading-[1.1] text-ink">{title}</p>
          <p className="mt-[1.6cqw] text-[length:4cqw] font-semibold text-emerald">{note}</p>
          <span aria-hidden="true" className="mt-[6cqw] block h-px bg-ink/15" />

          <span aria-hidden="true" className="mt-[6cqw] flex flex-col gap-[3.2cqw]">
            {LIGNES.map((w, i) => (
              <span key={i} className="block h-[1.8cqw] rounded-full bg-ink/10" style={{ width: w }} />
            ))}
          </span>

          <span aria-hidden="true" className="mt-[8cqw] grid grid-cols-2 gap-x-[7cqw] gap-y-[5cqw]">
            {[0, 1, 2, 3].map((i) => (
              <span key={i} className="block">
                <span className="block h-[1.3cqw] w-[45%] rounded-full bg-ink/25" />
                <span className="mt-[2cqw] block h-[1.8cqw] w-full rounded-full bg-ink/10" />
              </span>
            ))}
          </span>

          {/* Signature et sceau */}
          <span aria-hidden="true" className="absolute inset-x-[9cqw] bottom-[9cqw] flex items-end justify-between">
            <span className="block w-[44%]">
              <svg viewBox="0 0 120 40" className="block w-full text-ink/70">
                <path
                  d="M4 30 C 14 8, 22 6, 24 22 S 34 36, 42 18 S 56 4, 60 22 S 72 34, 80 20 S 96 10, 116 16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                />
              </svg>
              <span className="mt-[1cqw] block h-px bg-ink/35" />
              <span className="mt-[2cqw] block h-[1.3cqw] w-[60%] rounded-full bg-ink/20" />
            </span>
            <svg viewBox="0 0 100 100" className="block w-[27cqw] -rotate-[10deg]">
              <polygon points={SCEAU} fill="#2e8b14" />
              <circle cx="50" cy="50" r="38" fill="none" stroke="#ffffff" strokeOpacity="0.6" strokeWidth="1.2" strokeDasharray="2.4 2.4" />
              <circle cx="50" cy="50" r="31" fill="#0e3a20" />
              <path d="M37 51 l9 9 l17 -19" fill="none" stroke="#6bd63b" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
        </div>
      </div>
    </div>
  );
}
