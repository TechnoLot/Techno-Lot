import type { SessionPlatform } from "@/lib/ads/types";

/** Pastilles de marque minimalistes (SVG inline, pas de logo officiel). */
function MetaGlyph({ className = "h-3.5 w-3.5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round">
      <path d="M3 15c0-4 2-8 4.5-8C10 7 12 11 12 11s2-4 4.5-4C19 7 21 11 21 15c0 2-1 3-2.3 3-2.7 0-4.2-4.6-6.7-7.6C9.5 13.4 8 18 5.3 18 4 18 3 17 3 15Z" />
    </svg>
  );
}

function GoogleGlyph({ className = "h-3.5 w-3.5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round">
      <path d="M20 12.2h-8M20 12.2A8 8 0 1 1 17.4 6.3" />
    </svg>
  );
}

function InstagramGlyph({ className = "h-3.5 w-3.5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden fill="none" stroke="currentColor" strokeWidth={2}>
      <rect x="4" y="4" width="16" height="16" rx="5" />
      <circle cx="12" cy="12" r="3.6" />
      <circle cx="17" cy="7" r="0.6" fill="currentColor" />
    </svg>
  );
}

function FacebookGlyph({ className = "h-3.5 w-3.5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden fill="currentColor">
      <path d="M13.5 21v-7.5h2.6l.4-3h-3V8.6c0-.9.3-1.5 1.6-1.5h1.6V4.4c-.3 0-1.2-.1-2.3-.1-2.3 0-3.9 1.4-3.9 4v2.2H8v3h2.5V21h3Z" />
    </svg>
  );
}

const STYLES: Record<string, { label: string; cls: string; Icon: (p: { className?: string }) => JSX.Element }> = {
  meta: { label: "Meta", cls: "border-sky-400/30 bg-sky-400/10 text-sky-300", Icon: MetaGlyph },
  facebook: { label: "Facebook", cls: "border-blue-400/30 bg-blue-500/10 text-blue-300", Icon: FacebookGlyph },
  instagram: { label: "Instagram", cls: "border-pink-400/30 bg-pink-500/10 text-pink-300", Icon: InstagramGlyph },
  google: { label: "Google", cls: "border-amber-400/30 bg-amber-400/10 text-amber-300", Icon: GoogleGlyph },
};

export function PlatformIcon({ platform, className }: { platform: string; className?: string }) {
  const s = STYLES[platform] ?? STYLES.meta;
  return <s.Icon className={className} />;
}

/**
 * Badge plateforme. Pour Meta, si la pub n'a tourné que sur un réseau
 * (Facebook ou Instagram), on affiche ce réseau.
 */
export default function PlatformBadge({
  platform,
  publishers = [],
  compact = false,
}: {
  platform: SessionPlatform | string;
  publishers?: string[];
  compact?: boolean;
}) {
  let k = platform;
  if (platform === "meta") {
    const nets = publishers.filter((p) => p === "facebook" || p === "instagram");
    if (nets.length === 1) k = nets[0];
  }
  const s = STYLES[k];
  if (!s) {
    return (
      <span className="inline-flex items-center rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[11px] font-medium text-slate-300">
        {platform}
      </span>
    );
  }
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1 rounded-full border ${s.cls} ${compact ? "p-1" : "px-2 py-0.5"} text-[11px] font-semibold`}
      title={s.label}
    >
      <s.Icon />
      {compact ? <span className="sr-only">{s.label}</span> : s.label}
    </span>
  );
}
