"use client";

import { forwardRef, useEffect, useId, useState } from "react";
import { Mrs_Saint_Delafield } from "next/font/google";
import { site } from "@/lib/site";
import {
  MENTIONS_CERTIFICAT,
  dateLongue,
  jourSemaine,
  type ValeursCertificat,
} from "@/lib/admin/destruction";
import styles from "./CertificatDestruction.module.css";

/** Signature manuscrite (police), en attendant une signature numérisée. */
const signature = Mrs_Saint_Delafield({ weight: "400", subsets: ["latin"], display: "block" });

/**
 * Rosace guillochée : anneaux de cercles ondulés finement, chaque copie
 * déphasée sur un tour complet, ce qui tresse les lignes en cordon (comme sur
 * un papier de sécurité). Tracé lourd (≈ 400 ko) : calculé une seule fois,
 * dans le navigateur, plutôt qu'envoyé dans le HTML.
 */
let guillocheEnCache: string | null = null;
function cheminGuilloche(): string {
  if (guillocheEnCache) return guillocheEnCache;
  const cx = 320;
  const cy = 320;
  const pas = 720;
  const anneaux = [
    { R: 284, A: 9, n: 54, copies: 10 },
    { R: 236, A: 11, n: 44, copies: 10 },
    { R: 184, A: 12, n: 34, copies: 9 },
    { R: 130, A: 12, n: 24, copies: 8 },
    { R: 78, A: 10, n: 14, copies: 7 },
  ];
  const morceaux: string[] = [];
  for (const { R, A, n, copies } of anneaux) {
    for (let k = 0; k < copies; k++) {
      const phase = (k / copies) * 2 * Math.PI;
      for (let i = 0; i <= pas; i++) {
        const t = (i / pas) * 2 * Math.PI;
        const r = R + A * Math.sin(n * t + phase);
        morceaux.push(`${i ? "L" : "M"}${(cx + r * Math.cos(t)).toFixed(1)} ${(cy + r * Math.sin(t)).toFixed(1)}`);
      }
      morceaux.push("Z");
    }
  }
  guillocheEnCache = morceaux.join("");
  return guillocheEnCache;
}

/** Sceau : rosette dentelée de 64 pointes (même dessin que sur l'accueil). */
const ROSETTE = Array.from({ length: 64 }, (_, i) => {
  const a = (i / 64) * Math.PI * 2;
  const r = i % 2 ? 93 : 99;
  return `${(100 + Math.cos(a) * r).toFixed(2)},${(100 + Math.sin(a) * r).toFixed(2)}`;
}).join(" ");

/**
 * Le certificat remis au client, feuille Lettre 816 × 1056 px : c'est ce
 * nœud que l'export transforme en PDF et en photo. Les champs vides
 * s'affichent en gris pâle dans l'aperçu.
 */
const CertificatDestruction = forwardRef<HTMLDivElement, { valeurs: ValeursCertificat }>(
  function CertificatDestruction({ valeurs }, ref) {
    const id = useId().replace(/:/g, "");
    const [guilloche, setGuilloche] = useState<string | null>(guillocheEnCache);
    useEffect(() => {
      if (!guilloche) setGuilloche(cheminGuilloche());
    }, [guilloche]);

    const { numero, compagnie, adresse, materiel, nbAppareils, dateDestruction, dateEmission } = valeurs;
    const nbValide = Number.isInteger(nbAppareils) && nbAppareils > 0;
    const jour = jourSemaine(dateDestruction);
    const emission = dateLongue(dateEmission);

    return (
      <div ref={ref} className={styles.page}>
        <div className={styles.bande} aria-hidden />
        <svg className={styles.guilloche} viewBox="0 0 640 640" aria-hidden>
          {guilloche && (
            <path d={guilloche} fill="none" stroke="#2e8b14" strokeWidth={0.5} strokeOpacity={0.14} />
          )}
        </svg>

        <header className={styles.entete}>
          {/* eslint-disable-next-line @next/next/no-img-element -- intégrée telle quelle au PDF et à la photo */}
          <img
            className={styles.logo}
            src="/logo-horizontal-clair.png"
            alt="Techno Lot"
            width={945}
            height={239}
          />
          <div className={styles.numero}>
            <span className={styles.etiquette}>
              Certificat n<sup>o</sup>
            </span>
            <span className={`${styles.numeroValeur} ${numero ? "" : styles.vide}`}>
              {numero || "TL-…"}
            </span>
          </div>
        </header>

        <section className={styles.titre}>
          <h1>Certificat</h1>
          <p>de destruction des données</p>
          <span className={styles.titreBarre} aria-hidden />
        </section>

        <p className={styles.intro}>
          Techno Lot atteste que les données contenues dans les appareils reçus du client
          ci&#8209;dessous ont bien été détruites, et que cette destruction a été certifiée avec
          le logiciel KillDisk.
        </p>

        <section className={styles.haut}>
          <div className={styles.client}>
            <span className={styles.etiquette}>Client</span>
            <p className={`${styles.compagnie} ${compagnie ? "" : styles.vide}`}>
              {compagnie || "Nom de la compagnie"}
            </p>
            {adresse && <p className={styles.adresse}>{adresse}</p>}
            {materiel && (
              <p className={styles.materiel}>
                <span className={styles.cle}>Matériel reçu&nbsp;:</span> {materiel}
              </p>
            )}
          </div>
          <div className={styles.date}>
            <span className={styles.etiquette}>Date de la destruction</span>
            <p className={`${styles.jour} ${jour ? "" : styles.vide}`}>{jour || "Jour"}</p>
            <p className={`${styles.jourDate} ${jour ? "" : styles.vide}`}>
              {dateLongue(dateDestruction) || "Date"}
            </p>
          </div>
        </section>

        <section className={styles.preuve}>
          <div className={styles.preuveTete}>
            <span className={styles.etiquette}>Appareils traités</span>
            <svg className={styles.ico} viewBox="0 0 24 24" aria-hidden>
              <line x1="22" x2="2" y1="12" y2="12" />
              <path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
              <line x1="6" x2="6.01" y1="16" y2="16" />
              <line x1="10" x2="10.01" y1="16" y2="16" />
            </svg>
          </div>
          <div className={styles.preuveCorps}>
            <div className={styles.compte}>
              <p className={styles.chiffre}>{nbValide ? nbAppareils : "—"}</p>
              <p className={styles.quoi}>
                {nbValide && nbAppareils === 1 ? "appareil" : "appareils"} dont les données ont été
                détruites
              </p>
            </div>
            <div className={styles.certif}>
              <span className={styles.coche} aria-hidden>
                <svg viewBox="0 0 24 24">
                  <path d="M5 12.5l4.5 4.5L19 7.5" />
                </svg>
              </span>
              <p>
                <strong>Données détruites et certifiées avec KillDisk</strong>
                <small>Logiciel&nbsp;: {MENTIONS_CERTIFICAT.logiciel}</small>
              </p>
            </div>
          </div>
        </section>

        <div className={styles.bas}>
          <p className={styles.declaration}>
            Je certifie que les renseignements contenus dans ce certificat sont exacts. Conservez ce
            document dans vos dossiers&nbsp;: il sert de preuve de la destruction sécuritaire des
            renseignements personnels (Loi&nbsp;25).
          </p>

          <section className={styles.signature}>
            <div>
              <p className={styles.script} style={{ fontFamily: signature.style.fontFamily }}>
                {MENTIONS_CERTIFICAT.signataire}
              </p>
              <span className={styles.trait} />
              <p className={styles.nom}>{MENTIONS_CERTIFICAT.signataire}</p>
              <p className={styles.fonction}>{MENTIONS_CERTIFICAT.fonction}</p>
              <p className={styles.role}>{MENTIONS_CERTIFICAT.role}</p>
            </div>
            <div className={styles.emis}>
              <span className={styles.etiquette}>Émis le</span>
              <p className={`${styles.emisDate} ${emission ? "" : styles.vide}`}>{emission || "—"}</p>
            </div>
            <svg className={styles.sceau} viewBox="0 0 200 200" aria-hidden>
              <defs>
                <path id={`${id}-arc-haut`} d="M38,100 A62,62 0 0,1 162,100" />
                <path id={`${id}-arc-bas`} d="M29,100 A71,71 0 0,0 171,100" />
              </defs>
              <polygon points={ROSETTE} fill="#2e8b14" />
              <circle
                cx="100"
                cy="100"
                r="87"
                fill="none"
                stroke="#fff"
                strokeOpacity="0.55"
                strokeWidth="1.2"
                strokeDasharray="3 3"
              />
              <circle cx="100" cy="100" r="81" fill="#0e3a20" />
              <g textAnchor="middle">
                <text fontSize="13" letterSpacing="2.4">
                  <textPath href={`#${id}-arc-haut`} startOffset="50%">
                    TECHNO LOT
                  </textPath>
                </text>
                <text fontSize="12" letterSpacing="1.5">
                  <textPath href={`#${id}-arc-bas`} startOffset="50%">
                    DONNÉES DÉTRUITES
                  </textPath>
                </text>
              </g>
              <circle cx="34" cy="100" r="2.6" fill="#6bd63b" />
              <circle cx="166" cy="100" r="2.6" fill="#6bd63b" />
              <circle cx="100" cy="100" r="45" fill="none" stroke="#6bd63b" strokeOpacity="0.45" strokeWidth="1.2" />
              <path
                d="M80 101 l14 14 l27 -29"
                fill="none"
                stroke="#6bd63b"
                strokeWidth="10"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </section>

          <div className={styles.microtexte} aria-hidden>
            {`TECHNO LOT · CERTIFICAT DE DESTRUCTION DES DONNÉES · ${numero || "TL"} · `.repeat(14)}
          </div>
          <footer className={styles.pied}>
            <div>
              <strong>{site.name}</strong> · technolot.ca · {site.email} · {site.phone}
              <br />
              Adresse postale&nbsp;: 3235, avenue de la Gare, Mascouche (Québec)&nbsp; J7K&nbsp;3C1
            </div>
            <div className={styles.droite}>
              Certificat n<sup>o</sup> {numero || "TL-…"}
              <br />
              Page 1 de 1
            </div>
          </footer>
        </div>
      </div>
    );
  },
);

export default CertificatDestruction;
