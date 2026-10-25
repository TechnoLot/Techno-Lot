import Image from "next/image";
import { Archivo } from "next/font/google";
import HomeExperience from "@/components/home/HomeExperience";
import SubmissionForm from "@/components/SubmissionForm";
import { LOT_ASPECT, LOT_BANDS } from "@/components/home/lot-geometry";
import { getHomeContent } from "@/lib/home-content";
import { site } from "@/lib/site";
import { getDict, localePath, type Locale } from "@/lib/i18n";
import "@/components/home/scrollcraft.css";
import "@/components/home/accueil.css";

// Face d'affichage de l'accueil : un grotesque industriel à largeur variable,
// proche du mot-symbole condensé du logo. Le texte courant reste en Inter.
const archivo = Archivo({
  subsets: ["latin"],
  axes: ["wdth"],
  variable: "--font-tl",
  display: "swap",
});

// Même valeur `sizes` partout où une image revient (le lot, la pièce) pour
// que le navigateur ne la télécharge qu'une fois.
const SCENE_SIZES = "(min-width: 1024px) 56vw, 100vw";
const LOT_SIZES = "(min-width: 1024px) 30vw, 60vw";

const costPhotos = [
  "/accueil/entrepot.jpg",
  "/accueil/poussiere-serveur.jpg",
  "/accueil/disque.jpg",
];

/**
 * Nouvel accueil (scroll-craft), pas encore branché sur les routes : il le
 * sera quand les visuels kie.ai seront en place dans public/accueil.
 *
 * Accueil en scène partagée : à gauche l'avant (le matériel qui dort), à
 * droite l'après (le service). Le séparateur penche vers l'après au fil de
 * l'argument, puis s'efface au bord gauche à la fin, où le formulaire attend.
 * Le contenu est entièrement rendu côté serveur ; HomeExperience ne fait
 * qu'animer ce qui existe déjà.
 */
export default function HomeScene({ locale }: { locale: Locale }) {
  const c = getHomeContent(locale);
  const form = getDict(locale).form;
  const lotStyle = { "--tl-lot-aspect": LOT_ASPECT } as React.CSSProperties;

  return (
    <HomeExperience className={`tl ${archivo.variable}`}>
      {/* Les deux fonds de la scène partagée et le séparateur. Collés en haut
          de l'écran tant que l'accueil défile, puis ils partent avec lui. */}
      <div className="tl-canvas" aria-hidden="true">
        <div className="tl-canvas__apres" />
        <div className="tl-canvas__avant" />
        <div className="tl-grain" />
      </div>
      <div className="tl-seam" aria-hidden="true">
        <div className="tl-seam__rail">
          <span className="tl-seam__line" />
          <span className="tl-seam__tick" />
          <span className="tl-seam__label tl-seam__label--l" data-tl-mode="aa">
            {c.seam.avant}
          </span>
          <span className="tl-seam__label tl-seam__label--r" data-tl-mode="aa">
            {c.seam.apres}
          </span>
          <span className="tl-seam__label tl-seam__label--l" data-tl-mode="vn">
            {c.seam.vous}
          </span>
          <span className="tl-seam__label tl-seam__label--r" data-tl-mode="vn">
            {c.seam.nous}
          </span>
        </div>
      </div>

      {/* ===== 1. Le lot qui dort ===== */}
      <section
        className="tl-hero"
        data-sc-act="pin"
        data-sc-span="1.5"
        data-tl-span-reduced="1.2"
        aria-labelledby="tl-title"
      >
        <div className="tl-stage" data-sc-stage data-tl-hero>
          <div className="tl-frame tl-frame--hero">
            <div className="tl-plate tl-box">
              <div className="tl-plane tl-plane--far" data-tl-plane="far">
                <Image
                  src="/accueil/piece.jpg"
                  alt=""
                  fill
                  priority
                  sizes={SCENE_SIZES}
                />
              </div>
              <div className="tl-plane tl-plane--cone" data-tl-plane="cone" aria-hidden="true">
                <Image src="/accueil/cone.jpg" alt="" fill priority sizes={SCENE_SIZES} />
              </div>
            </div>
            <div className="tl-lot tl-lot--hero" style={lotStyle}>
              <div className="tl-plane" data-tl-plane="lot">
                <span className="tl-shadow" aria-hidden="true" />
                <Image
                  src="/accueil/lot.png"
                  alt={c.hero.lotAlt}
                  fill
                  priority
                  sizes={LOT_SIZES}
                />
              </div>
            </div>
            <div className="tl-near tl-box" aria-hidden="true">
              <div className="tl-plane tl-plane--near" data-tl-plane="near">
                <Image src="/accueil/poussiere.jpg" alt="" fill sizes={SCENE_SIZES} />
              </div>
            </div>
            <div className="sc-scrim sc-scrim--lead tl-hero__scrim" aria-hidden="true" />
            <p className="tl-hero__avant tl-greet" data-sc-cue="0 1 0 0">
              {c.hero.avant}
            </p>
            <p className="tl-label tl-hero__label" data-sc-cue="0.32 1 0.45 0">
              {c.hero.label}
            </p>
          </div>

          <div className="tl-hdiv tl-hdiv--hero" aria-hidden="true">
            <span>{c.seam.avant}</span>
            <span>{c.seam.apres}</span>
          </div>

          <div className="tl-hero__apres">
            <h1 id="tl-title" className="tl-display tl-hero__title tl-greet" data-sc-cue="0 1 0 0">
              {c.hero.title}
            </h1>
            <p className="tl-hero__sub tl-greet" data-sc-cue="0 1 0 0">
              {c.hero.sub}
            </p>
            <div className="tl-hero__cta tl-greet" data-sc-cue="0 1 0 0" data-sc-rise="0">
              <a className="tl-btn" href={localePath(locale, "/soumission")}>
                {c.hero.cta}
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ===== 2. Ce que ça coûte de le garder ===== */}
      <section className="tl-cost" aria-labelledby="tl-cost-title">
        <div className="tl-cost__head" data-sc-act="flow">
          <h2 id="tl-cost-title" className="tl-pair">
            <span className="tl-display tl-pair__l" data-sc-cue="0.1 1 0.3 0">
              {c.cost.titleAvant}
            </span>{" "}
            <span className="tl-display tl-pair__r" data-sc-cue="0.16 1 0.3 0">
              {c.cost.titleApres}
            </span>
          </h2>
        </div>
        {c.cost.rows.map((row, i) => (
          <div className="tl-row" data-sc-act="flow" key={row.avant}>
            <div className="tl-row__l">
              <figure
                className="tl-row__photo"
                data-sc-reveal="up"
                data-sc-reveal-at="0.1 0.38"
              >
                <Image
                  src={costPhotos[i]}
                  alt={row.photoAlt}
                  fill
                  sizes="(min-width: 1024px) 34vw, 100vw"
                />
              </figure>
              <p className="tl-row__avant" data-sc-cue="0.2 1 0.3 0">
                {row.avant}
              </p>
            </div>
            <div className="tl-hdiv tl-hdiv--row" aria-hidden="true">
              <span>{c.seam.avant}</span>
              <span>{c.seam.apres}</span>
            </div>
            <div className="tl-row__r">
              <p className="tl-row__apres" data-sc-cue="0.26 1 0.3 0">
                {row.apres}
              </p>
            </div>
          </div>
        ))}
      </section>

      {/* ===== 3. Comment ça marche ===== */}
      <section
        className="tl-proc"
        data-sc-act="flow"
        aria-labelledby="tl-proc-title"
      >
        <h2 id="tl-proc-title" className="tl-pair tl-pair--proc">
          <span
            className="tl-display tl-pair__l"
            data-sc-cue="0.06 1 0.4 0"
            data-sc-kinetic="lines"
          >
            {c.process.titleVous}
          </span>{" "}
          <span
            className="tl-display tl-pair__r"
            data-sc-cue="0.1 1 0.4 0"
            data-sc-kinetic="lines"
          >
            {c.process.titleNous}
          </span>
        </h2>
        <ol className="tl-steps">
          {c.process.steps.map((s) => (
            <li className="tl-step" key={s.vous} data-sc-in data-sc-stagger="70">
              <div className="tl-step__l">
                <span className="tl-mini tl-label" aria-hidden="true">
                  {c.seam.vous}
                </span>
                <p className="tl-step__head">{s.vous}</p>
                <p className="tl-step__note">{s.vousNote}</p>
              </div>
              <div className="tl-step__r">
                <span className="tl-mini tl-label" aria-hidden="true">
                  {c.seam.nous}
                </span>
                <p className="tl-step__head">{s.nous}</p>
                <p className="tl-step__note">{s.nousNote}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* ===== 4. La ligne de rachat (le pic) ===== */}
      <section
        className="tl-peak"
        data-sc-act="pin"
        data-sc-span="3.6"
        data-tl-span-reduced="2.4"
        aria-labelledby="tl-ledger-title"
      >
        <div className="tl-stage" data-sc-stage data-tl-peak data-sc-verify-state="">
          <div className="tl-frame tl-frame--peak">
            <div className="tl-plate tl-box">
              <div className="tl-plane tl-plane--far">
                <Image src="/accueil/piece.jpg" alt="" fill priority sizes={SCENE_SIZES} />
              </div>
              <div className="tl-plane tl-plane--cone" aria-hidden="true">
                <Image src="/accueil/cone.jpg" alt="" fill priority sizes={SCENE_SIZES} />
              </div>
            </div>
            <div className="tl-lot tl-lot--peak" style={lotStyle}>
              {LOT_BANDS.map((b, i) => {
                const first = i === 0;
                const lastBand = i === LOT_BANDS.length - 1;
                // La première bande s'ouvre vers le haut et la dernière vers
                // le bas (l'ombre de contact suit la palette).
                const top = first ? -10 : b.top * 100;
                const bottom = lastBand ? -14 : (1 - b.bottom) * 100;
                return (
                  <div
                    className="tl-band"
                    data-tl-band={i}
                    key={i}
                    style={{
                      clipPath: `inset(${top.toFixed(2)}% -40% ${bottom.toFixed(2)}% -40%)`,
                    }}
                  >
                    {lastBand && <span className="tl-shadow" aria-hidden="true" />}
                    <Image src="/accueil/lot.png" alt="" fill priority sizes={LOT_SIZES} />
                  </div>
                );
              })}
            </div>
          </div>

          <div className="tl-hdiv tl-hdiv--peak" aria-hidden="true">
            <span>{c.seam.avant}</span>
            <span>{c.seam.apres}</span>
          </div>

          <div className="tl-ledger">
            <h2 id="tl-ledger-title" className="tl-ledger__title">
              {c.ledger.title}
            </h2>
            <ol className="tl-ledger__lines">
              {c.ledger.lines.map((l, i) => (
                <li
                  className="tl-line"
                  data-tl-line={i}
                  key={l.item}
                  style={
                    {
                      "--m": ((LOT_BANDS[i].top + LOT_BANDS[i].bottom) / 2).toFixed(4),
                    } as React.CSSProperties
                  }
                >
                  <span className="tl-line__item">{l.item}</span>
                  <span className="tl-line__leader" aria-hidden="true" />
                  <span className="tl-line__status">{l.status}</span>
                </li>
              ))}
            </ol>
            <p className="tl-ledger__more" data-tl-more>
              {c.ledger.more}
            </p>
            <dl className="tl-ledger__pay" data-tl-pay>
              {c.ledger.payment.map((p) => (
                <div key={p.label}>
                  <dt>{p.label}</dt>
                  <dd>{p.value}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="tl-done" data-tl-done>
            <p className="tl-display tl-done__title">{c.ledger.titleDone}</p>
            <a className="tl-btn" href="#soumission">
              {c.ledger.cta}
            </a>
          </div>
        </div>
      </section>

      {/* ===== 5. Le formulaire, dans l'espace libéré ===== */}
      <section
        id="soumission"
        className="tl-close"
        data-sc-act="flow"
        aria-labelledby="tl-close-title"
      >
        <div className="tl-close__inner">
          <div className="tl-close__main" data-sc-in data-sc-stagger="70">
            <h2 id="tl-close-title" className="tl-display tl-close__title">
              {c.close.title}
            </h2>
            <p className="tl-close__text">{c.close.text}</p>
            <div className="tl-close__form">
              <SubmissionForm locale={locale} />
            </div>
          </div>
          <aside className="tl-close__side" data-sc-in data-sc-stagger="70">
            <dl className="tl-contact">
              <div>
                <dt>{c.close.contactLabels.phone}</dt>
                <dd>
                  <a href={site.phoneHref}>{site.phone}</a>
                </dd>
              </div>
              <div>
                <dt>{c.close.contactLabels.email}</dt>
                <dd>
                  <a href={`mailto:${site.email}`}>{site.email}</a>
                </dd>
              </div>
              <div>
                <dt>{c.close.contactLabels.address}</dt>
                <dd>
                  <a href={site.address.mapsUrl} target="_blank" rel="noopener noreferrer">
                    {site.address.full}
                  </a>
                </dd>
              </div>
              <div>
                <dt>{c.close.contactLabels.delay}</dt>
                <dd>{c.close.delayValue}</dd>
              </div>
            </dl>
            <div className="tl-clause">
              <p className="tl-clause__title">{form.paymentClauseTitle}</p>
              {form.paymentClauseText.map((line, i) => (
                <p key={i}>
                  {line.split(/(\*\*[^*]+\*\*)/g).map((part, j) =>
                    part.startsWith("**") && part.endsWith("**") ? (
                      <strong key={j}>{part.slice(2, -2)}</strong>
                    ) : (
                      <span key={j}>{part}</span>
                    )
                  )}
                </p>
              ))}
            </div>
            <p className="tl-close__unique">{c.close.unique}</p>
          </aside>
        </div>
      </section>
    </HomeExperience>
  );
}
