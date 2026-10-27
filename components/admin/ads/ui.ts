/**
 * Classes partagées de la section « Publicités » (version B, claire épurée).
 * Couleurs : encre #0a0a0a, secondaire #4f5a52, bordures #e3eadf / #edf2ea,
 * vert #257a10, lime #6bd63b, rouge #b42318, ambre #b54708.
 */

export const card = "rounded-2xl border border-[#e3eadf] bg-white";

export const cardTitle = "font-display text-[17px] font-semibold leading-tight text-[#0a0a0a]";

export const cardSub = "mt-1 text-[13px] leading-relaxed text-[#4f5a52]";

const focus =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#257a10]";

export const btnPrimary = `inline-flex items-center justify-center gap-2 rounded-full bg-[#257a10] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#1e6a0b] disabled:cursor-wait disabled:opacity-75 ${focus}`;

export const btnSecondary = `inline-flex items-center justify-center gap-2 rounded-full border border-[#c9d6c3] bg-white px-4 py-2.5 text-sm font-semibold text-[#0a0a0a] transition-colors hover:border-[#257a10] hover:text-[#257a10] ${focus}`;

export const focusRing = focus;

/** En-tête de tableau sobre */
export const th = "whitespace-nowrap px-4 py-3 text-left text-[13px] font-medium text-[#4f5a52]";
