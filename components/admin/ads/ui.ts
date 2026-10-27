/**
 * Classes partagées de la section « Publicités » (version B, claire épurée).
 * Couleurs : encre #0a0a0a, secondaire #4f5a52, bordures #e3eadf / #edf2ea,
 * vert #257a10, lime #6bd63b, rouge #b42318, ambre #b54708.
 */

export const card = "rounded-2xl border border-admin-line bg-admin-card";

export const cardTitle = "font-display text-[17px] font-semibold leading-tight text-admin-ink";

export const cardSub = "mt-1 text-[13px] leading-relaxed text-admin-muted";

const focus =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-admin-green";

export const btnPrimary = `inline-flex items-center justify-center gap-2 rounded-full bg-[#257a10] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#1e6a0b] disabled:cursor-wait disabled:opacity-75 ${focus}`;

export const btnSecondary = `inline-flex items-center justify-center gap-2 rounded-full border border-admin-line-strong bg-admin-card px-4 py-2.5 text-sm font-semibold text-admin-ink transition-colors hover:border-admin-green hover:text-admin-green ${focus}`;

export const focusRing = focus;

/** En-tête de tableau sobre */
export const th = "whitespace-nowrap px-4 py-3 text-left text-[13px] font-medium text-admin-muted";
