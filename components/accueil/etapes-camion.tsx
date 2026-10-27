"use client";

import { useEffect, useId, useRef } from "react";
import Image from "next/image";

/* Repères mesurés sur camion-techno-lot.webp (1200 × 497, même gabarit que la camionnette d'ILR),
   en fraction de la largeur / hauteur de l'image. */
const REAR_TIRE = { x: 0.812, y: 0.995 };
const WHEELS = [
  { left: "7.8%", top: "67%", size: "13%" },
  { left: "75%", top: "70.5%", size: "12.4%" },
];
/** Arrivée : vitesse constante, puis freinage appuyé jusqu'à l'arrêt (en secondes). */
const DELAY = 0.1;
const CRUISE = 0.5;
const BRAKE = 0.75;
const PITCH = 1.4; // plongée du nez au freinage, en degrés

type Puff = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  grow: number;
  age: number;
  life: number;
  a: number;
  rot: number;
  spr: number;
};

/** Petites volutes de fumée, pré-rendues une fois (plusieurs bulles douces superposées). */
function makeSprites() {
  return Array.from({ length: 3 }, () => {
    const c = document.createElement("canvas");
    c.width = c.height = 128;
    const g = c.getContext("2d");
    if (!g) return c;
    for (let i = 0; i < 7; i++) {
      const x = 64 + (Math.random() - 0.5) * 36;
      const y = 64 + (Math.random() - 0.5) * 36;
      const r = 26 + Math.random() * 26;
      const grad = g.createRadialGradient(x, y, 0, x, y, r);
      grad.addColorStop(0, "rgba(150,150,154,0.62)");
      grad.addColorStop(0.55, "rgba(170,170,174,0.26)");
      grad.addColorStop(1, "rgba(190,190,194,0)");
      g.fillStyle = grad;
      g.fillRect(0, 0, 128, 128);
    }
    return c;
  });
}

/**
 * Étape 3 (copie de VanArrival d'ILR) : la camionnette entre en trombe par la droite, freine fort
 * (fumée sur les pneus arrière, roues floues, le nez plonge), puis se pose avec un léger rebond.
 */
export function EtapesCamion({ reduce }: { reduce: boolean }) {
  const boxRef = useRef<HTMLDivElement>(null);
  const vanRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const blurRef = useRef<SVGFEGaussianBlurElement>(null);
  const wheelRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const filterId = `van-blur-${useId().replace(/[^a-zA-Z0-9]/g, "")}`;

  useEffect(() => {
    const box = boxRef.current;
    const van = vanRef.current;
    const body = bodyRef.current;
    const canvas = canvasRef.current;
    const stage = box?.closest<HTMLElement>("[data-stage]");
    const ctx = canvas?.getContext("2d");
    if (reduce || !box || !van || !body || !canvas || !stage || !ctx) return;
    // l'aperçu existe en double (mobile et bureau) : la copie masquée reste garée, sans animation
    if (!stage.offsetWidth) {
      van.style.transform = "none";
      return;
    }

    const sprites = makeSprites();
    const puffs: Puff[] = [];
    let dpr = 1,
      offX = 0,
      offY = 0,
      startX = 0,
      w = 0,
      h = 0;

    const measure = () => {
      const s = stage.getBoundingClientRect();
      const b = box.getBoundingClientRect();
      dpr = Math.min(2, window.devicePixelRatio || 1);
      w = b.width;
      h = b.height;
      // le canevas couvre toute la scène (+ une marge), repère local = boîte de la camionnette
      offX = s.left - b.left;
      offY = s.top - b.top - 40;
      canvas.style.left = `${offX}px`;
      canvas.style.top = `${offY}px`;
      canvas.style.width = `${s.width}px`;
      canvas.style.height = `${s.height + 80}px`;
      canvas.width = Math.round(s.width * dpr);
      canvas.height = Math.round((s.height + 80) * dpr);
      startX = s.right - b.left + 12;
    };
    measure();

    const v0 = startX / (CRUISE + BRAKE / 2);
    const stopAt = CRUISE + BRAKE;
    const state = (t: number) => {
      if (t <= 0) return { x: startX, v: v0 };
      if (t < CRUISE) return { x: startX - v0 * t, v: v0 };
      if (t < stopAt) {
        const u = t - CRUISE;
        return { x: startX - v0 * CRUISE - v0 * u + (v0 * u * u) / (2 * BRAKE), v: v0 * (1 - u / BRAKE) };
      }
      return { x: 0, v: 0 };
    };

    const spawn = (x: number, y: number, speed: number, burst = false) => {
      puffs.push({
        x: x + Math.random() * w * 0.05,
        y: y - Math.random() * w * 0.03,
        vx: (burst ? (Math.random() - 0.3) * 90 : 40 + Math.random() * 90) + speed * 0.12,
        vy: -(12 + Math.random() * (burst ? 30 : 55)),
        r: w * (0.03 + Math.random() * 0.03),
        grow: w * (0.08 + Math.random() * 0.1),
        age: 0,
        life: 1.5 + Math.random() * 1.2,
        a: burst ? 0.6 : 0.4 + Math.random() * 0.3,
        rot: Math.random() * Math.PI * 2,
        spr: (Math.random() * sprites.length) | 0,
      });
    };

    let raf = 0,
      t0 = 0,
      last = 0,
      acc = 0,
      burstDone = false;
    const frame = (now: number) => {
      if (!t0) t0 = last = now;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const t = (now - t0) / 1000 - DELAY;
      const { x, v } = state(t);
      const k = v / v0;

      // caisse : plongée au freinage, rebond amorti à l'arrêt, vibrations de la route en roulant
      let rot = 0;
      if (t > CRUISE && t < stopAt) rot = -PITCH * Math.min(1, (t - CRUISE) / 0.18);
      else if (t >= stopAt) {
        const s = t - stopAt;
        rot = -PITCH * Math.exp(-4.5 * s) * Math.cos(9 * s);
      }
      const shake = k * (Math.sin(t * 57) * 0.6 + Math.sin(t * 23) * 0.4);
      van.style.transform = `translate3d(${x.toFixed(2)}px,0,0)`;
      body.style.transform = `translateY(${shake.toFixed(2)}px) rotate(${rot.toFixed(3)}deg)`;
      blurRef.current?.setAttribute("stdDeviation", `${(k * 5).toFixed(2)} 0`);
      body.style.filter = k > 0.04 ? `url(#${filterId})` : "none";
      for (const el of wheelRefs.current) if (el) el.style.opacity = Math.min(1, k * 1.6).toFixed(3);

      // fumée des pneus arrière : légère en roulant, épaisse au freinage, bouffée finale à l'arrêt
      const tx = x + REAR_TIRE.x * w;
      const ty = REAR_TIRE.y * h;
      if (t > 0 && t < stopAt) {
        acc += dt * (t > CRUISE ? 95 : 22);
        while (acc >= 1) {
          spawn(tx, ty, v);
          acc -= 1;
        }
      } else if (t >= stopAt && !burstDone) {
        burstDone = true;
        for (let i = 0; i < 16; i++) spawn(tx, ty, 0, true);
      }

      ctx.setTransform(dpr, 0, 0, dpr, -offX * dpr, -offY * dpr);
      ctx.clearRect(offX, offY, canvas.width / dpr, canvas.height / dpr);
      for (let i = puffs.length - 1; i >= 0; i--) {
        const p = puffs[i];
        p.age += dt;
        if (p.age >= p.life) {
          puffs.splice(i, 1);
          continue;
        }
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vx *= 1 - 1.6 * dt;
        p.vy = p.vy * (1 - 1.1 * dt) - 10 * dt;
        p.r += p.grow * dt * (1 - p.age / p.life);
        p.rot += dt * 0.4;
        const life = p.age / p.life;
        ctx.globalAlpha = p.a * Math.min(1, p.age / 0.1) * (1 - life) ** 1.6;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.drawImage(sprites[p.spr], -p.r, -p.r, p.r * 2, p.r * 2);
        ctx.restore();
      }
      ctx.globalAlpha = 1;

      if (t < stopAt + 1.5 || puffs.length) raf = requestAnimationFrame(frame);
      else body.style.transform = "none";
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [reduce, filterId]);

  return (
    <div ref={boxRef} className="relative w-full max-w-[560px]">
      {/* Route */}
      <span aria-hidden="true" className="absolute bottom-[1%] left-0 right-0 h-px bg-ink/15" />
      <svg aria-hidden="true" className="absolute h-0 w-0">
        <filter id={filterId} x="-10%" y="0" width="120%" height="100%">
          <feGaussianBlur ref={blurRef} stdDeviation="0 0" />
        </filter>
      </svg>
      <div
        ref={vanRef}
        className="relative will-change-transform"
        style={reduce ? undefined : { transform: "translate3d(200vw,0,0)" }}
      >
        <span aria-hidden="true" className="absolute bottom-[-2%] left-[4%] h-[9%] w-[92%] rounded-[50%] bg-ink/30 blur-md" />
        <div ref={bodyRef} className="relative origin-[50%_88%]">
          <Image
            src="/images/camion/camion-techno-lot.webp"
            alt=""
            width={1200}
            height={497}
            sizes="(max-width: 1024px) 90vw, 40vw"
            className="h-auto w-full drop-shadow-[0_18px_22px_rgba(10,10,10,0.25)]"
          />
          {/* Roues floues tant que la camionnette roule */}
          {WHEELS.map((wh, i) => (
            <span
              key={wh.left}
              ref={(el) => {
                wheelRefs.current[i] = el;
              }}
              aria-hidden="true"
              className="absolute aspect-square rounded-full opacity-0 backdrop-blur-[3px]"
              style={{ left: wh.left, top: wh.top, width: wh.size }}
            />
          ))}
        </div>
      </div>
      {!reduce && <canvas ref={canvasRef} aria-hidden="true" className="pointer-events-none absolute z-10" />}
    </div>
  );
}
