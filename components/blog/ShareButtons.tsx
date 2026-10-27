"use client";

import { useState } from "react";
import { Check, Facebook, Link2, Linkedin, Mail } from "lucide-react";

type Labels = { title: string; copy: string; copied: string; email: string };

/** Partage d'un article : LinkedIn, Facebook, courriel, copie du lien. */
export default function ShareButtons({
  url,
  title,
  labels,
  className,
}: {
  url: string;
  title: string;
  labels: Labels;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);
  const u = encodeURIComponent(url);
  const links = [
    { href: `https://www.linkedin.com/sharing/share-offsite/?url=${u}`, label: "LinkedIn", Icon: Linkedin },
    { href: `https://www.facebook.com/sharer/sharer.php?u=${u}`, label: "Facebook", Icon: Facebook },
  ];

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      window.prompt(labels.copy, url);
    }
  };

  return (
    <div className={className}>
      <p className="font-display text-xs font-semibold uppercase tracking-[0.16em] text-moss">{labels.title}</p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {links.map(({ href, label, Icon }) => (
          <a
            key={label}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={label}
            className="blog-share-btn"
          >
            <Icon className="h-4 w-4" aria-hidden="true" />
          </a>
        ))}
        <a
          href={`mailto:?subject=${encodeURIComponent(title)}&body=${u}`}
          aria-label={labels.email}
          className="blog-share-btn"
        >
          <Mail className="h-4 w-4" aria-hidden="true" />
        </a>
        <button type="button" onClick={copy} className="blog-share-btn blog-share-btn--wide">
          {copied ? <Check className="h-4 w-4" aria-hidden="true" /> : <Link2 className="h-4 w-4" aria-hidden="true" />}
          <span aria-live="polite">{copied ? labels.copied : labels.copy}</span>
        </button>
      </div>
    </div>
  );
}
