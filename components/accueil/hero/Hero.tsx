import type { CSSProperties } from "react";
import Image from "next/image";
import { ChevronDown } from "lucide-react";
import { getDict, localePath, type Locale } from "@/lib/i18n";
import { GhostButtonLink, PrimaryButtonLink } from "@/components/site/Button";
import { Magnetic } from "@/components/site/Magnetic";
import { getContenuHero } from "./contenu-hero";
import { HeroFx } from "./HeroFx";
import "./hero.css";

const TITLE_ID = "heros-accueil-titre";
/** Cible du chevron : posée à la toute fin du héros (début de la section suivante). */
const AFTER_ID = "apres-heros";

/* Chorégraphie d'entrée (secondes) : logo → titre mot à mot → trait → sous-titre → boutons */
const WORD_START = 0.35;
const WORD_STEP = 0.07;

const delay = (s: number) => ({ "--hero-tl-d": `${s.toFixed(2)}s` }) as CSSProperties;

/**
 * Héros de l'accueil : l'ancien héros Techno Lot (bleu nuit, lueurs vertes,
 * constellation, logo empilé, « Vos lots informatiques ont de la valeur »),
 * rendu interactif. Composant serveur : tout le texte est dans le HTML et les
 * entrées sont en keyframes CSS ; HeroFx (client) ajoute ensuite les effets
 * (particules, parallaxe, inclinaison et glitch du logo, épinglage « hyperespace »).
 */
export function Hero({ locale }: { locale: Locale }) {
  const t = getDict(locale).hero;
  const extra = getContenuHero(locale);
  const startWords = t.titleStart.split(" ");
  const accentWords = t.titleAccent.split(" ");
  const wordsCount = startWords.length + accentWords.length;
  const underlineAt = WORD_START + wordsCount * WORD_STEP + 0.2;
  const subtitleAt = underlineAt + 0.15;
  const ctaAt = subtitleAt + 0.15;

  return (
    <section
      data-under-header=""
      data-theme="night"
      data-hero-tl=""
      aria-labelledby={TITLE_ID}
      className="hero-tl-root relative bg-night-900 text-white"
    >
      <div className="hero-tl-sticky">
        {/* Décor : grille fine, grandes lueurs vertes en diagonale, balayage lumineux */}
        <div aria-hidden="true" className="hero-tl-bg">
          <div className="hero-tl-grid" />
          <div className="hero-tl-glow hero-tl-glow--a">
            <span />
          </div>
          <div className="hero-tl-glow hero-tl-glow--b">
            <span />
          </div>
          <div className="hero-tl-glow hero-tl-glow--c">
            <span />
          </div>
          <div className="hero-tl-sweep" />
        </div>

        {/* Constellation de particules (canvas, démarré après la première peinture) */}
        <HeroFx />

        <div aria-hidden="true" className="hero-tl-grain" />
        {/* Bas du héros fondu dans le bleu nuit : raccord invisible avec le chapitre suivant */}
        <div aria-hidden="true" className="hero-tl-fondu" />

        <div className="hero-tl-stage">
          <div className="hero-tl-content">
            {/* Logo empilé : inclinaison 3D, reflet et glitch RVB (calques masqués par le logo) */}
            <div className="hero-tl-enter-logo">
              <div className="hero-tl-logo" data-hero-logo="">
                <span aria-hidden="true" className="hero-tl-logo-halo" />
                <div className="hero-tl-logo-tilt">
                  <Image
                    src="/logo.png"
                    alt={extra.logoAlt}
                    width={1919}
                    height={1158}
                    priority
                    sizes="(min-width: 1024px) 384px, (min-width: 640px) 304px, 240px"
                    className="hero-tl-logo-img"
                  />
                  <span aria-hidden="true" className="hero-tl-fx hero-tl-sheen" />
                  <span aria-hidden="true" className="hero-tl-fx hero-tl-sheen-sweep" />
                  <span aria-hidden="true" className="hero-tl-fx hero-tl-glitch hero-tl-glitch--r" />
                  <span aria-hidden="true" className="hero-tl-fx hero-tl-glitch hero-tl-glitch--c" />
                  <span aria-hidden="true" className="hero-tl-fx hero-tl-glitch hero-tl-glitch--w" />
                </div>
              </div>
            </div>

            <h1 id={TITLE_ID} className="hero-tl-title">
              <span className="block">
                {startWords.map((word, i) => (
                  <span key={`s-${i}`}>
                    <span className="hero-tl-word" style={delay(WORD_START + i * WORD_STEP)}>
                      {word}
                    </span>
                    {i < startWords.length - 1 ? " " : ""}
                  </span>
                ))}
              </span>{" "}
              <span className="hero-tl-accent">
                {accentWords.map((word, i) => (
                  <span key={`a-${i}`}>
                    <span
                      className="hero-tl-word"
                      style={delay(WORD_START + (startWords.length + i) * WORD_STEP)}
                    >
                      {word}
                    </span>
                    {i < accentWords.length - 1 ? " " : ""}
                  </span>
                ))}
                <span aria-hidden="true" className="hero-tl-underline" style={delay(underlineAt)} />
              </span>
            </h1>

            <p className="hero-tl-sub" style={delay(subtitleAt)}>
              <span className="hero-tl-sub-start">{t.subtitleStart}</span>
              <span aria-hidden="true" className="hero-tl-sub-bar" />{" "}
              <span className="hero-tl-sub-end">{t.subtitleEnd}</span>
            </p>

            <div className="hero-tl-ctas" style={delay(ctaAt)}>
              <Magnetic>
                <span className="relative inline-flex">
                  <span aria-hidden="true" className="hero-tl-cta-halo" />
                  <PrimaryButtonLink href={localePath(locale, "/soumission")}>{t.ctaPrimary}</PrimaryButtonLink>
                </span>
              </Magnetic>
              <Magnetic>
                <GhostButtonLink href="#comment-ca-marche">{t.ctaSecondary}</GhostButtonLink>
              </Magnetic>
            </div>
          </div>
        </div>

        {/* Indicateur de défilement : trait + chevron qui rebondit */}
        <a href={`#${AFTER_ID}`} aria-label={extra.scrollLabel} className="hero-tl-scroll">
          <span className="hero-tl-scroll-in" style={delay(ctaAt + 0.3)}>
            <span aria-hidden="true" className="hero-tl-scroll-line" />
            <ChevronDown aria-hidden="true" className="hero-tl-chevron h-5 w-5" />
          </span>
        </a>
      </div>

      <span id={AFTER_ID} aria-hidden="true" className="hero-tl-after" />
    </section>
  );
}
