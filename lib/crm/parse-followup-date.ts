/**
 * Détection d'une date de rappel dans une note libre en français.
 * Exemples reconnus : « à rappeler lundi », « demain », « le 21 juillet »,
 * « 21/07 », « dans 2 semaines », « semaine prochaine ».
 *
 * Retourne une date « YYYY-MM-DD » (toujours aujourd'hui ou dans le futur),
 * ou null si aucune date n'est détectée.
 */

const WEEKDAYS: Record<string, number> = {
  dimanche: 0,
  lundi: 1,
  mardi: 2,
  mercredi: 3,
  jeudi: 4,
  vendredi: 5,
  samedi: 6,
};

const MONTHS: Record<string, number> = {
  janvier: 1,
  janv: 1,
  fevrier: 2,
  fev: 2,
  mars: 3,
  avril: 4,
  avr: 4,
  mai: 5,
  juin: 6,
  juillet: 7,
  juil: 7,
  aout: 8,
  septembre: 9,
  sept: 9,
  sep: 9,
  octobre: 10,
  oct: 10,
  novembre: 11,
  nov: 11,
  decembre: 12,
  dec: 12,
};

/** Retire les accents et met en minuscules pour matcher sans ambiguïté. */
function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

/** Date « aujourd'hui » en heure du Québec, peu importe où tourne le serveur. */
export function todayInQuebec(): Date {
  const ymd = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Toronto",
  }).format(new Date());
  return new Date(ymd + "T00:00:00");
}

function toIso(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function addDays(d: Date, n: number): Date {
  const out = new Date(d);
  out.setDate(out.getDate() + n);
  return out;
}

export function parseFollowupDate(
  note: string,
  today: Date = todayInQuebec(),
): string | null {
  const text = normalize(note);

  // « 21/07 », « 21/07/2026 », « 21-07 »
  const numeric = text.match(/\b(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2,4}))?\b/);
  if (numeric) {
    const day = Number(numeric[1]);
    const month = Number(numeric[2]);
    let year = numeric[3] ? Number(numeric[3]) : today.getFullYear();
    if (year < 100) year += 2000;
    if (day >= 1 && day <= 31 && month >= 1 && month <= 12) {
      let d = new Date(year, month - 1, day);
      // Sans année explicite, une date passée = l'an prochain
      if (!numeric[3] && d < today) d = new Date(year + 1, month - 1, day);
      if (d >= today) return toIso(d);
    }
  }

  // « le 21 juillet », « 3 sept », « 1er août 2026 »
  const monthNames = Object.keys(MONTHS).sort((a, b) => b.length - a.length);
  const textual = text.match(
    new RegExp(
      `\\b(\\d{1,2})(?:er)?\\s+(${monthNames.join("|")})\\.?(?:\\s+(\\d{4}))?\\b`,
    ),
  );
  if (textual) {
    const day = Number(textual[1]);
    const month = MONTHS[textual[2]];
    const year = textual[3] ? Number(textual[3]) : today.getFullYear();
    if (day >= 1 && day <= 31) {
      let d = new Date(year, month - 1, day);
      if (!textual[3] && d < today) d = new Date(year + 1, month - 1, day);
      if (d >= today) return toIso(d);
    }
  }

  // « après-demain » avant « demain » (sinon « demain » matche en premier)
  if (/\bapres[- ]demain\b/.test(text)) return toIso(addDays(today, 2));
  if (/\bdemain\b/.test(text)) return toIso(addDays(today, 1));
  if (/\baujourd ?'?hui\b/.test(text)) return toIso(today);

  // « dans 3 jours », « dans 2 semaines », « dans 1 mois »
  const relative = text.match(
    /\bdans\s+(\d+)\s+(jour|jours|semaine|semaines|mois)\b/,
  );
  if (relative) {
    const n = Number(relative[1]);
    const unit = relative[2];
    if (unit.startsWith("jour")) return toIso(addDays(today, n));
    if (unit.startsWith("semaine")) return toIso(addDays(today, n * 7));
    const d = new Date(today);
    d.setMonth(d.getMonth() + n);
    return toIso(d);
  }

  // « semaine prochaine » → lundi prochain
  if (/\bsemaine\s+prochaine\b/.test(text)) {
    const daysToMonday = ((1 - today.getDay() + 7) % 7) || 7;
    return toIso(addDays(today, daysToMonday));
  }

  // « lundi », « mardi prochain »… → prochaine occurrence de ce jour
  for (const [name, dow] of Object.entries(WEEKDAYS)) {
    if (new RegExp(`\\b${name}\\b`).test(text)) {
      const days = ((dow - today.getDay() + 7) % 7) || 7;
      return toIso(addDays(today, days));
    }
  }

  return null;
}
