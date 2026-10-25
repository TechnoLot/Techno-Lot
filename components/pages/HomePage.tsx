import Image, { getImageProps } from "next/image";
import HomeExperience from "@/components/home/HomeExperience";
import SubmissionForm from "@/components/SubmissionForm";
import { LOGO_BOX, MARQUE } from "@/components/home/marque";
import { getHomeContent } from "@/lib/home-content";
import { site } from "@/lib/site";
import { getDict, localePath, type Locale } from "@/lib/i18n";
import "@/components/home/scrollcraft.css";
import "@/components/home/accueil.css";

// Poids visuel des objets du rail : un commutateur plat et un petit
// ordinateur carré ne remplissent pas leur cadre de la même façon.
const OBJ_SCALE: Record<string, number> = {
  serveurs: 1.08,
  portables: 1,
  reseau: 1.1,
  stockage: 0.94,
  ecrans: 1,
  postes: 0.8,
};

// Art direction de l'affiche du hero : la vidéo portrait (recadrage central)
// sert les écrans plus hauts que larges. Même seuil que HomeExperience.
const PORTRAIT_MQ = "(max-aspect-ratio: 4/5)";

/**
 * Accueil « le centre de données ».
 *
 * 1. Une allée de serveurs vivante : la vidéo avance sous la main, le logo
 *    attend au point de fuite, dans la brume.
 * 2. Ce que nous rachetons : un rail latéral d'objets.
 * 3. Comment ça marche : quatre étapes, le calme avant le pic.
 * 4. La mise hors tension (le pic) : l'allée s'éteint baie par baie, la
 *    lumière revient sur une salle vide et la boucle du logo se dessine.
 * 5. Le formulaire.
 *
 * Tout le contenu est rendu côté serveur ; HomeExperience ne fait qu'animer
 * ce qui existe déjà. Sans JavaScript, la page reste complète.
 */
export default function HomePage({ locale }: { locale: Locale }) {
  const c = getHomeContent(locale);
  const form = getDict(locale).form;

  const posterCommon = { alt: "", fill: true, priority: true, sizes: "100vw" } as const;
  const {
    props: { srcSet: posterPortrait },
  } = getImageProps({ ...posterCommon, src: "/accueil/allee-m.webp", quality: 80 });
  const { props: posterProps } = getImageProps({
    ...posterCommon,
    src: "/accueil/allee.webp",
    quality: 80,
  });

  const markStyle = {
    "--tl-mark-l": LOGO_BOX.mark.left,
    "--tl-mark-w": LOGO_BOX.mark.width,
    "--tl-word-t": LOGO_BOX.word.top,
    "--tl-logo-aspect": LOGO_BOX.aspect,
  } as React.CSSProperties;

  return (
    <HomeExperience className="tl">
      {/* ===== 1. L'allée vivante ===== */}
      <section
        className="tl-hero"
        data-sc-act="scrub"
        data-sc-span="2.6"
        data-tl-span-reduced="1.2"
        aria-labelledby="tl-title"
      >
        <div className="tl-stage" data-sc-stage>
          <picture>
            <source media={PORTRAIT_MQ} srcSet={posterPortrait} sizes="100vw" />
            {/* eslint-disable-next-line jsx-a11y/alt-text */}
            <img {...posterProps} className="sc-stage__poster" />
          </picture>
          <video
            data-sc-scrub
            data-sc-src="/accueil/allee.mp4"
            data-tl-src-portrait="/accueil/allee-m.mp4"
            muted
            playsInline
            preload="none"
            aria-hidden="true"
          />
          <canvas className="tl-leds tl-leds--hero" data-tl-leds="hero" aria-hidden="true" />
          <div className="tl-hero__haze" aria-hidden="true" />

          <div className="tl-scrim tl-scrim--hero" aria-hidden="true" data-tl-scrim-hero />
          <div className="tl-hero__layout">
            <div className="tl-hero__logo-zone">
              {/* Le logo et sa ligne avancent ensemble vers la caméra. */}
              <div className="tl-hero__logo" data-tl-hero-logo>
                <div className="tl-hero__mark" data-tl-hero-mark>
                  <Image
                    src="/logo.png"
                    alt="Techno Lot"
                    width={1919}
                    height={1158}
                    priority
                    sizes="(min-width: 1024px) 260px, 200px"
                  />
                  <span className="tl-hero__veil" aria-hidden="true" />
                </div>
                <span className="tl-hero__linescrim" aria-hidden="true" />
                <p className="tl-hero__line" data-sc-cue="0.36 1 0.3 0.25">
                  <span>{c.hero.logoLine[0]}</span> <span>{c.hero.logoLine[1]}</span>
                </p>
              </div>
            </div>

            <div className="tl-hero__copy tl-greet" data-sc-cue="0 0.44 0 0.55">
              <h1 id="tl-title" className="tl-hero__title">
                <span className="tl-hero__l1">{c.hero.titleStart}</span>{" "}
                <span className="tl-hero__accent">{c.hero.titleAccent}</span>
              </h1>
              <p className="tl-hero__sub">{c.hero.sub}</p>
              <a className="tl-btn" href={localePath(locale, "/soumission")}>
                {c.hero.cta}
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ===== 2. Ce que nous rachetons ===== */}
      <section
        className="tl-range"
        data-sc-act="pan"
        data-sc-span="3.4"
        aria-labelledby="tl-range-title"
      >
        <div className="tl-stage tl-range__stage" data-sc-stage>
          <div className="tl-range__floor" aria-hidden="true" />
          <div className="tl-rail" data-sc-pan="0.02" data-tl-rail>
            <div className="tl-rail__intro">
              <h2 id="tl-range-title" className="tl-h2">
                {c.range.title}
              </h2>
              <p className="tl-rail__lede">{c.range.intro}</p>
            </div>
            {c.range.items.map((it) => (
              <figure
                className="tl-obj"
                key={it.key}
                data-tl-obj
                style={{ "--tl-k": OBJ_SCALE[it.key] ?? 1 } as React.CSSProperties}
              >
                <div className="tl-obj__stage">
                  <span className="tl-obj__shadow" data-tl-shadow aria-hidden="true" />
                  <div className="tl-obj__tilt" data-sc-tilt="7">
                    <div className="tl-obj__turn" data-tl-turn>
                      {/* chargées d'emblée : dans un rail qui glisse, le chargement
                          paresseux les ferait apparaître en retard */}
                      <Image
                        src={`/accueil/rachat-${it.key}.webp`}
                        alt={it.alt}
                        width={1100}
                        height={1100}
                        loading="eager"
                        sizes="(min-width: 1024px) 28vw, 70vw"
                      />
                    </div>
                  </div>
                </div>
                <figcaption className="tl-obj__label">
                  <span className="tl-obj__name">{it.name}</span>
                  <span className="tl-obj__desc">{it.desc}</span>
                </figcaption>
              </figure>
            ))}
            <div className="tl-rail__outro">
              <p>{c.range.more}</p>
              <a className="tl-link" href="#formulaire" data-tl-rail-link>
                {c.range.cta}
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ===== 3. Comment ça marche ===== */}
      <section
        className="tl-steps"
        data-sc-act="flow"
        id="comment-ca-marche"
        aria-labelledby="tl-steps-title"
      >
        <div className="tl-steps__inner">
          <header className="tl-steps__head" data-sc-in>
            <h2 id="tl-steps-title" className="tl-h2">
              {c.steps.title}
            </h2>
            <p className="tl-steps__intro">{c.steps.intro}</p>
          </header>
          <ol className="tl-steps__list" data-sc-in data-sc-stagger="70">
            {c.steps.list.map((s, i) => (
              <li className="tl-step" key={s.title}>
                <span className="tl-step__n" aria-hidden="true">
                  {i + 1}
                </span>
                <h3 className="tl-step__t">{s.title}</h3>
                <p className="tl-step__d">{s.text}</p>
              </li>
            ))}
          </ol>
          <p className="tl-steps__data" data-sc-in>
            {c.steps.data}
          </p>
        </div>
      </section>

      {/* ===== 4. La mise hors tension (le pic) ===== */}
      <section
        className="tl-peak"
        data-sc-act="pin"
        data-sc-span="4.2"
        data-tl-span-reduced="2"
        aria-labelledby="tl-peak-title"
      >
        <div className="tl-stage tl-peak__stage" data-sc-stage data-sc-verify-state="">
          <div className="tl-peak__scene" data-tl-scene>
            <Image className="tl-peak__plate" src="/accueil/allee-sombre.webp" alt="" fill sizes="100vw" />
          </div>
          <canvas className="tl-peak__shade" data-tl-shade aria-hidden="true" />
          <canvas className="tl-leds tl-leds--peak" data-tl-leds="peak" aria-hidden="true" />
          <div className="tl-peak__scene tl-peak__scene--lit" data-tl-scene data-tl-lit>
            <Image className="tl-peak__plate" src="/accueil/salle-vide.webp" alt="" fill sizes="100vw" />
            <div className="tl-peak__mark" data-tl-mark style={markStyle} aria-hidden="true">
              <span className="tl-peak__glow" data-tl-glow />
              <div className="tl-peak__logo">
                <svg
                  className="tl-peak__svg"
                  viewBox={`0 0 ${MARQUE.w} ${MARQUE.h}`}
                  focusable="false"
                >
                  <defs>
                    <mask
                      id={`tl-mark-mask-${locale}`}
                      maskUnits="userSpaceOnUse"
                      x="0"
                      y="0"
                      width={MARQUE.w}
                      height={MARQUE.h}
                    >
                      <path
                        d={MARQUE.main}
                        data-tl-mark-main
                        pathLength={1}
                        fill="none"
                        stroke="#fff"
                        strokeWidth={MARQUE.mask}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeDasharray="1 1"
                        strokeDashoffset="0"
                      />
                      <path
                        d={MARQUE.barbs}
                        data-tl-mark-barbs
                        pathLength={1}
                        fill="none"
                        stroke="#fff"
                        strokeWidth={MARQUE.mask}
                        strokeLinecap="round"
                        strokeDasharray="1 1"
                        strokeDashoffset="0"
                      />
                      <rect
                        data-tl-mark-dollar
                        x={MARQUE.dollar.x}
                        y={MARQUE.dollar.y}
                        width={MARQUE.dollar.w}
                        height={MARQUE.dollar.h}
                        fill="#fff"
                      />
                    </mask>
                  </defs>
                  <image
                    href="/accueil/logo-marque.png"
                    width={MARQUE.w}
                    height={MARQUE.h}
                    mask={`url(#tl-mark-mask-${locale})`}
                  />
                </svg>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  className="tl-peak__word"
                  data-tl-word
                  src="/accueil/logo-mot.png"
                  alt=""
                  width={1816}
                  height={277}
                  loading="lazy"
                />
              </div>
            </div>
          </div>
          <div className="tl-peak__fade" aria-hidden="true" />

          <div className="tl-scrim tl-scrim--lead" aria-hidden="true" data-tl-scrim-a />
          <div className="tl-peak__a" data-sc-cue="0.1 0.56 0.2 0.25">
            <p className="tl-peak__lead">{c.peak.lead}</p>
            <p className="tl-peak__leadtext">{c.peak.leadText}</p>
          </div>

          <div className="tl-scrim tl-scrim--band" aria-hidden="true" data-tl-scrim-b />
          <div className="tl-peak__b" data-sc-cue="0.8 1 0.3 0">
            <h2 id="tl-peak-title" className="tl-peak__title">
              {c.peak.titleStart} <span className="tl-g">{c.peak.titleAccent}</span>
            </h2>
            <p className="tl-peak__sub">{c.peak.sub}</p>
            <a className="tl-btn" href="#formulaire" data-sc-rise="0">
              {c.peak.cta}
            </a>
          </div>
        </div>
      </section>

      {/* ===== 5. Le formulaire ===== */}
      <section
        id="formulaire"
        className="tl-close"
        data-sc-act="flow"
        aria-labelledby="tl-close-title"
      >
        <div className="tl-close__inner">
          <div className="tl-close__main" data-sc-in data-sc-stagger="70">
            <h2 id="tl-close-title" className="tl-h2">
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
