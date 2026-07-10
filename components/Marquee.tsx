import {
  Laptop,
  Server,
  Network,
  HardDrive,
  Phone,
  Printer,
  Monitor,
  Cpu,
  Tablet,
  Camera,
} from "lucide-react";

const items = [
  { icon: Laptop, label: "Ordinateurs et portables" },
  { icon: Server, label: "Serveurs" },
  { icon: Network, label: "Équipements réseau" },
  { icon: HardDrive, label: "Stockage" },
  { icon: Phone, label: "Télécommunication" },
  { icon: Printer, label: "Bureautique" },
  { icon: Monitor, label: "Écrans et moniteurs" },
  { icon: Cpu, label: "Composants" },
  { icon: Tablet, label: "Tablettes" },
  { icon: Camera, label: "Audio / Vidéo" },
];

/** Bandeau défilant des catégories d'équipements rachetés. */
export default function Marquee() {
  const row = [...items, ...items];
  return (
    <div className="relative overflow-hidden border-y border-white/5 bg-night-950/60 py-5">
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-24 bg-gradient-to-r from-night-900 to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-24 bg-gradient-to-l from-night-900 to-transparent" />
      <div className="flex w-max animate-marquee gap-12 hover:[animation-play-state:paused] motion-reduce:animate-none">
        {row.map(({ icon: Icon, label }, i) => (
          <div
            key={i}
            className="flex items-center gap-3 whitespace-nowrap text-sm font-medium text-slate-400"
            aria-hidden={i >= items.length}
          >
            <Icon className="h-4 w-4 text-accent" aria-hidden />
            {label}
          </div>
        ))}
      </div>
    </div>
  );
}
