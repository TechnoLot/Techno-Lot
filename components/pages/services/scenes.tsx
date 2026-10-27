import Image from "next/image";
import type { CSSProperties, ReactNode } from "react";

/**
 * Scène « Prise en charge » (rendu serveur, animée en CSS par --p) :
 * le matériel se pose sur la palette, la palette est filmée, glisse dans le fourgon, puis le fourgon part.
 */
export function LoadingScene() {
  const drops = [
    { src: "/images/palette/obj-serveur.webp", w: 882, h: 277, width: "92%", bottom: "17%", at: 0.02 },
    { src: "/images/palette/obj-commutateur.webp", w: 807, h: 239, width: "86%", bottom: "37%", at: 0.09 },
    { src: "/images/palette/obj-pile-portables.webp", w: 546, h: 298, width: "74%", bottom: "53%", at: 0.16 },
  ];
  return (
    <div className="svc-load" aria-hidden="true">
      <div className="svc-load-halo" />
      <div className="svc-load-floor" />
      <div className="svc-load-road" />
      <div className="svc-load-van">
        <Image src="/images/camion/camion-techno-lot.webp" alt="" width={1200} height={497} sizes="(max-width: 1024px) 64vw, 420px" />
        <div className="svc-load-speed" />
      </div>
      <div className="svc-load-pallet">
        <Image className="svc-load-base" src="/images/palette/palette-vide.webp" alt="" width={1400} height={306} sizes="200px" />
        {drops.map((d) => (
          <Image
            key={d.src}
            className="svc-load-drop"
            src={d.src}
            alt=""
            width={d.w}
            height={d.h}
            sizes="200px"
            style={{ width: d.width, bottom: d.bottom, "--at": d.at } as CSSProperties}
          />
        ))}
        <Image className="svc-load-wrapped" src="/images/palette/palette-pleine.webp" alt="" width={1000} height={1082} sizes="220px" />
      </div>
    </div>
  );
}

/** Photo d'objet sur fond noir studio (accueil/rachat-*), recadrée dans la scène. */
export function PhotoFrame({ src, position = "50% 60%" }: { src: string; position?: string }) {
  return (
    <div className="absolute inset-0 bg-[#05080d]">
      <Image
        src={src}
        alt=""
        fill
        sizes="(max-width: 1024px) 100vw, 640px"
        className="object-cover"
        style={{ objectPosition: position }}
      />
      <div aria-hidden="true" className="absolute inset-0 bg-[radial-gradient(120%_80%_at_50%_110%,transparent_40%,rgba(10,15,28,0.55))]" />
    </div>
  );
}

/** Objet détouré posé sur un halo, avec des étiquettes facultatives. */
export function ObjectFrame({
  src,
  w,
  h,
  width = "62%",
  tags,
}: {
  src: string;
  w: number;
  h: number;
  width?: string;
  tags?: ReactNode[];
}) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 p-8">
      <div aria-hidden="true" className="absolute left-1/2 top-1/2 h-[78%] w-[78%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(107,214,59,0.22),transparent)]" />
      <Image
        src={src}
        alt=""
        width={w}
        height={h}
        sizes="(max-width: 1024px) 70vw, 420px"
        className="relative h-auto drop-shadow-[0_24px_24px_rgba(0,0,0,0.45)]"
        style={{ width }}
      />
      {tags && (
        <div className="relative flex flex-wrap justify-center gap-2">
          {tags.map((tag, i) => (
            <span key={i} className="rounded-full bg-[#6bd63b] px-3.5 py-1.5 font-display text-xs font-semibold uppercase tracking-[0.12em] text-[#0a0a0a]">
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

/** Radar : Mascouche au centre, les ondes couvrent tout le Québec. */
export function RadarFrame({ center, edge, address }: { center: string; edge: string; address: string }) {
  return (
    <div className="absolute inset-0 overflow-hidden bg-[#070b14]">
      <div className="absolute left-1/2 top-1/2 aspect-square w-[118%] -translate-x-1/2 -translate-y-1/2">
        {[22, 44, 66, 88].map((s) => (
          <span key={s} className="svc-radar-ring" style={{ width: `${s}%`, height: `${s}%` }} />
        ))}
        <span className="svc-radar-sweep" />
        <span className="svc-radar-pulse" />
        <span className="svc-radar-pulse svc-radar-pulse--2" />
      </div>
      <div className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center text-center">
        <span className="relative flex h-4 w-4">
          <span className="absolute inset-0 rounded-full bg-[#6bd63b]" />
          <span className="absolute -inset-2 rounded-full border-2 border-[#6bd63b]/50" />
        </span>
        <span className="mt-4 font-display text-2xl font-bold tracking-[-0.01em] text-white sm:text-3xl">{center}</span>
        <span className="mt-1 text-sm text-slate-300">{address}</span>
      </div>
      <span className="absolute left-6 top-6 rounded-full border border-[#6bd63b]/40 px-3.5 py-1.5 font-display text-xs font-semibold uppercase tracking-[0.14em] text-[#8BE95F]">
        {edge}
      </span>
    </div>
  );
}

/** Courriel d'offre reçu (estimation, étape 2). */
export function OfferFrame({ label, big, caption }: { label: string; big: string; caption: string }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center p-6 sm:p-10">
      <div aria-hidden="true" className="absolute left-1/2 top-1/2 h-[80%] w-[80%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(107,214,59,0.2),transparent)]" />
      <div className="relative w-full max-w-sm rounded-[22px] bg-white p-6 text-[#0a0a0a] sm:p-8">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#6bd63b]">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="#0a0a0a" strokeWidth="2" aria-hidden="true">
              <rect x="3" y="5" width="18" height="14" rx="2" />
              <path d="m3 7 9 6 9-6" />
            </svg>
          </span>
          <span className="font-display text-sm font-semibold uppercase tracking-[0.12em] text-[#2b7a10]">{label}</span>
        </div>
        <p className="mt-6 font-display text-6xl font-bold leading-none tracking-[-0.03em] sm:text-7xl">{big}</p>
        <p className="mt-3 text-sm text-[#4f5650]">{caption}</p>
        <div className="mt-6 space-y-2" aria-hidden="true">
          <span className="block h-2 w-full rounded-full bg-[#e8f5e0]" />
          <span className="block h-2 w-4/5 rounded-full bg-[#e8f5e0]" />
          <span className="block h-2 w-3/5 rounded-full bg-[#e8f5e0]" />
        </div>
      </div>
    </div>
  );
}

/** Anneau 50 % : moitié au ramassage, solde après l'inspection. */
export function PaymentFrame({ value, caption, note }: { value: string; caption: string; note: string }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-5 p-6">
      <div className="relative aspect-square w-[52%] max-w-[260px]">
        <svg viewBox="0 0 36 36" className="h-full w-full -rotate-90" aria-hidden="true">
          <circle cx="18" cy="18" r="15.915" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="3" />
          <circle className="svc-donut-arc" cx="18" cy="18" r="15.915" fill="none" stroke="#6bd63b" strokeWidth="3" strokeLinecap="round" pathLength={100} />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="font-display text-4xl font-bold text-white sm:text-5xl">{value}</span>
          <span className="mt-1 max-w-[8rem] text-xs leading-snug text-slate-300 sm:text-sm">{caption}</span>
        </div>
      </div>
      <span className="rounded-full border border-[#6bd63b]/40 px-4 py-1.5 text-center font-display text-xs font-semibold uppercase tracking-[0.12em] text-[#8BE95F]">
        {note}
      </span>
    </div>
  );
}
