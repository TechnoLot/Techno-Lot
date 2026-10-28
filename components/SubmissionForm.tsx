"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { ArrowLeft, ArrowRight, CircleAlert, Loader2, Pencil, Send, TriangleAlert } from "lucide-react";
import { getDict, type Locale } from "@/lib/i18n";
import { getAttribution, trackEvent } from "@/lib/tracking/attribution";
import { trackLeadConversion } from "@/components/tracking/AdPixels";
import { Categories } from "@/components/formulaire/Categories";
import { Depot, type FichierJoint } from "@/components/formulaire/Depot";
import { Progression } from "@/components/formulaire/Progression";
import { Succes } from "@/components/formulaire/Succes";
import {
  CATEGORIES,
  composerMessage,
  formatTaille,
  getTextesFormulaire,
  type Autre,
  type Quantites,
} from "@/components/formulaire/textes";
import "./formulaire.css";

type Status = "idle" | "loading" | "success" | "error";
type ChampContact = "nom" | "courriel" | "telephone";
type Valeurs = Record<ChampContact | "entreprise" | "ville" | "message", string>;

const MAX_TOTAL_SIZE = 15 * 1024 * 1024; // 15 Mo (limite des pièces jointes, comme l'API)
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[\d\s\-().+]{7,20}$/;
const INVENTAIRE_RE = /\.(xlsx?|csv|pdf)$/i;
const PHOTO_RE = /\.(jpe?g|png|webp|gif|heic|heif|avif|bmp|tiff?)$/i;
const DERNIERE = 2;
const VIDE: Valeurs = { nom: "", courriel: "", telephone: "", entreprise: "", ville: "", message: "" };

/**
 * Formulaire de soumission en trois étapes (matériel → coordonnées → envoi).
 * Contrat inchangé avec /api/soumission : nom, courriel, telephone, message,
 * inventaire, photos, locale, tl_verif (piège à robots) et tl_attr
 * (attribution publicitaire, ajoutée au moment de l'envoi). Les catégories,
 * l'entreprise et la ville sont ajoutées au début de `message`.
 * Sans JavaScript, les trois étapes restent visibles et le formulaire se poste
 * directement à l'API.
 */
export default function SubmissionForm({ locale = "fr" }: { locale?: Locale }) {
  const f = getDict(locale).form;
  const t = getTextesFormulaire(locale);
  const uid = useId();
  const id = (name: string) => `${uid}-${name}`;

  const rootRef = useRef<HTMLDivElement>(null);
  const headingRefs = useRef<Array<HTMLHeadingElement | null>>([]);
  const firstInvalidRef = useRef<Partial<Record<ChampContact, HTMLInputElement | null>>>({});
  const filesInputRef = useRef<HTMLDivElement>(null);
  const startedRef = useRef(false);
  const stepChanged = useRef(false);
  const seq = useRef(0);

  const [enhanced, setEnhanced] = useState(false);
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState<1 | -1>(1);
  const [values, setValues] = useState<Valeurs>(VIDE);
  const [touched, setTouched] = useState<Partial<Record<ChampContact, boolean>>>({});
  const [quantites, setQuantites] = useState<Quantites>({});
  const [autres, setAutres] = useState<Autre[]>([]);
  const [inventaire, setInventaire] = useState<FichierJoint[]>([]);
  const [photos, setPhotos] = useState<FichierJoint[]>([]);
  const [rejet, setRejet] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [serverError, setServerError] = useState("");
  const [annonce, setAnnonce] = useState("");
  const [focusChamp, setFocusChamp] = useState<ChampContact | null>(null);

  // Amélioration progressive : sans JS, toutes les étapes restent affichées.
  useEffect(() => setEnhanced(true), []);

  // form_view : une seule fois, quand le formulaire entre dans le viewport.
  useEffect(() => {
    const el = rootRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries.some((en) => en.isIntersecting)) {
          trackEvent("form_view");
          obs.disconnect();
        }
      },
      { threshold: 0.3 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // Libère les aperçus (blob:) au démontage.
  const photosRef = useRef(photos);
  photosRef.current = photos;
  useEffect(
    () => () => photosRef.current.forEach((p) => p.url && URL.revokeObjectURL(p.url)),
    [],
  );

  // Changement d'étape : focus sur le titre et retour en haut du formulaire.
  useEffect(() => {
    if (!stepChanged.current) return;
    stepChanged.current = false;
    headingRefs.current[step]?.focus({ preventScroll: true });
    remonter();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  useEffect(() => {
    if (!focusChamp) return;
    firstInvalidRef.current[focusChamp]?.focus();
    setFocusChamp(null);
  }, [focusChamp]);

  // form_start : premier focus/saisie dans le formulaire, une seule fois.
  function markStarted() {
    if (startedRef.current) return;
    startedRef.current = true;
    trackEvent("form_start");
  }

  function annoncer(message: string) {
    // Caractère invisible alterné : un message identique est quand même relu.
    setAnnonce((prev) => (prev.endsWith("​") ? message : `${message}​`));
  }

  function remonter() {
    const el = rootRef.current;
    if (!el) return;
    const header = parseFloat(getComputedStyle(el).getPropertyValue("--site-header-h")) || 96;
    const top = el.getBoundingClientRect().top;
    if (top >= header) return;
    const y = window.scrollY + top - header - 16;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (window.__lenis) window.__lenis.scrollTo(y, { immediate: reduce });
    else window.scrollTo({ top: y, behavior: reduce ? "auto" : "smooth" });
  }

  function allerA(next: number) {
    setDir(next > step ? 1 : -1);
    stepChanged.current = true;
    setStep(next);
  }

  // ---------------------------- Validation ----------------------------

  function erreurChamp(name: ChampContact, raw: string): string | undefined {
    const v = raw.trim();
    if (name === "nom") return v ? undefined : f.nameError;
    if (name === "courriel") return !v ? f.emailErrorEmpty : EMAIL_RE.test(v) ? undefined : f.emailErrorInvalid;
    return !v ? f.phoneErrorEmpty : PHONE_RE.test(v) ? undefined : f.phoneErrorInvalid;
  }

  const contactKeys: ChampContact[] = ["nom", "courriel", "telephone"];
  const erreurs = Object.fromEntries(
    contactKeys.map((k) => [k, touched[k] ? erreurChamp(k, values[k]) : undefined]),
  ) as Partial<Record<ChampContact, string>>;

  const totalTaille = [...inventaire, ...photos].reduce((s, x) => s + x.file.size, 0);
  const tropLourd = totalTaille > MAX_TOTAL_SIZE;

  /** Valide les coordonnées ; renvoie le premier champ invalide. */
  function validerContact(): ChampContact | null {
    setTouched({ nom: true, courriel: true, telephone: true });
    return contactKeys.find((k) => erreurChamp(k, values[k])) ?? null;
  }

  function suivant() {
    if (step === 0) {
      if (tropLourd) {
        filesInputRef.current?.querySelector<HTMLInputElement>("input[type=file]")?.focus();
        return;
      }
      allerA(1);
    } else if (step === 1) {
      const bad = validerContact();
      if (bad) {
        // Focus après le rendu : le message d'erreur est alors lié au champ et lu avec lui.
        setFocusChamp(bad);
        return;
      }
      allerA(2);
    }
  }

  // ------------------------------ Fichiers ------------------------------

  function ajouter(kind: "inventaire" | "photos", liste: File[]) {
    const ok = kind === "inventaire" ? (x: File) => INVENTAIRE_RE.test(x.name) : (x: File) => x.type.startsWith("image/") || PHOTO_RE.test(x.name);
    const acceptes = liste.filter(ok);
    const refuses = liste.filter((x) => !ok(x));
    const existants = kind === "inventaire" ? inventaire : photos;
    const cle = (x: File) => `${x.name}|${x.size}|${x.lastModified}`;
    const deja = new Set(existants.map((e) => cle(e.file)));
    const nouveaux: FichierJoint[] = acceptes
      .filter((x) => !deja.has(cle(x)))
      .map((file) => ({
        id: `${kind}-${++seq.current}`,
        file,
        url: kind === "photos" ? URL.createObjectURL(file) : undefined,
      }));

    if (kind === "inventaire") setInventaire((prev) => [...prev, ...nouveaux]);
    else setPhotos((prev) => [...prev, ...nouveaux]);

    const msgRejet = refuses.length ? t.rejected(refuses.map((x) => x.name).join(", ")) : "";
    setRejet(msgRejet);
    annoncer([nouveaux.length ? t.filesAdded(nouveaux.length) : "", msgRejet].filter(Boolean).join(" "));
  }

  function retirer(kind: "inventaire" | "photos", fid: string) {
    const liste = kind === "inventaire" ? inventaire : photos;
    const cible = liste.find((x) => x.id === fid);
    if (!cible) return;
    if (cible.url) URL.revokeObjectURL(cible.url);
    if (kind === "inventaire") setInventaire((prev) => prev.filter((x) => x.id !== fid));
    else setPhotos((prev) => prev.filter((x) => x.id !== fid));
    setRejet("");
    annoncer(t.fileRemoved(cible.file.name));
  }

  function toutVider() {
    photos.forEach((p) => p.url && URL.revokeObjectURL(p.url));
    setInventaire([]);
    setPhotos([]);
    setValues(VIDE);
    setQuantites({});
    setAutres([]);
    setTouched({});
    setRejet("");
  }

  // -------------------------------- Envoi --------------------------------

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (status === "loading") return;
    // Entrée dans un champ avant la dernière étape : on avance d'une étape.
    if (step < DERNIERE) {
      suivant();
      return;
    }
    if (tropLourd) {
      allerA(0);
      return;
    }
    const bad = validerContact();
    if (bad) {
      allerA(1);
      setFocusChamp(bad);
      return;
    }

    const form = e.currentTarget;
    const data = new FormData(form);
    // Les fichiers vivent dans l'état (glisser-déposer, retrait) : on les remet.
    data.delete("inventaire");
    data.delete("photos");
    inventaire.forEach((x) => data.append("inventaire", x.file, x.file.name));
    photos.forEach((x) => data.append("photos", x.file, x.file.name));
    data.set(
      "message",
      composerMessage({
        quantites,
        autres,
        entreprise: values.entreprise,
        ville: values.ville,
        description: values.message,
      }),
    );

    // Attribution publicitaire (incluant l'id de session) pour ad_leads.
    try {
      const attr = getAttribution();
      if (attr) data.set("tl_attr", JSON.stringify(attr));
    } catch {
      /* ignore */
    }

    setStatus("loading");
    setServerError("");
    annoncer(t.sendingStatus);
    try {
      const res = await fetch("/api/soumission", {
        method: "POST",
        body: data,
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json?.error ?? f.genericError);
      }
      setStatus("success");
      trackEvent("form_submit");
      trackLeadConversion();
      toutVider();
      requestAnimationFrame(remonter);
    } catch (err) {
      setStatus("error");
      setServerError(err instanceof Error ? err.message : f.genericError);
    }
  }

  // ------------------------------- Rendu -------------------------------

  if (status === "success") {
    return (
      <div ref={rootRef} className="tlf">
        <Succes
          t={t}
          title={f.successTitle}
          text={f.successText}
          againLabel={f.successAgain}
          onAgain={() => {
            stepChanged.current = true;
            setStatus("idle");
            setStep(0);
            setDir(1);
          }}
        />
      </div>
    );
  }

  const visible = (i: number) => !enhanced || step === i;
  const loading = status === "loading";
  const choisies = CATEGORIES.filter((c) => c !== "autre" && quantites[c] !== undefined);
  const fichiers = [...inventaire, ...photos];
  const taille = (n: number) => formatTaille(n, locale);
  const filesErrId = id("fichiers-err");
  const filesDescribedBy = [tropLourd ? filesErrId : "", rejet ? id("rejet") : ""].filter(Boolean).join(" ") || undefined;

  function champ(
    name: ChampContact | "entreprise" | "ville",
    label: string,
    input: { type?: string; autoComplete: string; placeholder: string; inputMode?: "email" | "tel" | "text" },
    required: boolean,
  ) {
    const err = required ? erreurs[name as ChampContact] : undefined;
    const errId = id(`${name}-err`);
    return (
      <div>
        <label htmlFor={id(name)} className="tlf-label">
          {label}
          {required ? (
            <span className="tlf-req" aria-hidden="true">
              *
            </span>
          ) : (
            <span className="tlf-label-note">({t.optional})</span>
          )}
        </label>
        <input
          ref={required ? (el) => void (firstInvalidRef.current[name as ChampContact] = el) : undefined}
          id={id(name)}
          // Seuls les champs du contrat API portent un name.
          name={required ? name : undefined}
          type={input.type ?? "text"}
          inputMode={input.inputMode}
          autoComplete={input.autoComplete}
          placeholder={input.placeholder}
          required={required}
          aria-required={required || undefined}
          aria-invalid={err ? true : undefined}
          aria-describedby={err ? errId : undefined}
          className="tlf-field"
          value={values[name]}
          onChange={(e) => setValues((v) => ({ ...v, [name]: e.target.value }))}
          onBlur={() => {
            if (required && values[name].trim()) setTouched((s) => ({ ...s, [name]: true }));
          }}
        />
        {err && <ErrorText id={errId}>{err}</ErrorText>}
      </div>
    );
  }

  return (
    <div ref={rootRef} className="tlf">
      <form
        onSubmit={onSubmit}
        onFocusCapture={markStarted}
        onInputCapture={markStarted}
        noValidate
        // Sans JavaScript, le navigateur poste directement à l'API (jamais en GET).
        action="/api/soumission"
        method="post"
        encType="multipart/form-data"
        aria-busy={loading}
        className="tlf-panel"
      >
        {/* Langue pour les messages d'erreur du serveur */}
        <input type="hidden" name="locale" value={locale} />

        {/* Honeypot anti-spam — caché aux humains */}
        <div className="absolute -left-[9999px] top-auto h-px w-px overflow-hidden" aria-hidden="true">
          {/* Nom neutre : « entreprise_site » pouvait être rempli par l'autoremplissage
              (champ Entreprise juste à côté), ce qui faisait ignorer une vraie soumission. */}
          <label htmlFor={id("tl-verif")}>{f.honeypotLabel}</label>
          <input type="text" id={id("tl-verif")} name="tl_verif" tabIndex={-1} autoComplete="off" />
        </div>

        <Progression steps={t.steps} current={step} label={t.progressLabel} stepOf={t.stepOf} />

        {/* ------------------------- 1. Votre matériel ------------------------- */}
        <section
          aria-labelledby={id("h0")}
          hidden={!visible(0)}
          className="tlf-stage mt-8"
          data-dir={enhanced && step === 0 && dir === -1 ? -1 : undefined}
        >
          <h2 id={id("h0")} ref={(el) => void (headingRefs.current[0] = el)} tabIndex={-1} className="tlf-stage-title">
            {t.materialTitle}
          </h2>
          <p className="tlf-stage-hint">{t.materialHint}</p>

          <div className="mt-6">
            <Categories
              t={t}
              quantites={quantites}
              onChange={setQuantites}
              autres={autres}
              onAutresChange={setAutres}
              onAnnounce={annoncer}
            />
          </div>

          <div className="mt-7">
            <label htmlFor={id("message")} className="tlf-label">
              {t.descriptionLabel}
              <span className="tlf-label-note">({t.descriptionOptional})</span>
            </label>
            <textarea
              id={id("message")}
              name="message"
              rows={4}
              placeholder={t.descriptionPlaceholder}
              className="tlf-field"
              value={values.message}
              onChange={(e) => setValues((v) => ({ ...v, message: e.target.value }))}
            />
          </div>

          <div className="mt-7" ref={filesInputRef}>
            <p className="tlf-subtitle">{t.filesTitle}</p>
            <p className="mt-1 text-sm text-moss">{t.filesHint}</p>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Depot
                name="inventaire"
                accept=".xls,.xlsx,.csv,.pdf"
                title={t.dropInventoryTitle}
                text={t.dropInventoryText}
                formats={t.dropInventoryFormats}
                activeText={t.dropActive}
                files={inventaire}
                onAdd={(l) => ajouter("inventaire", l)}
                onRemove={(fid) => retirer("inventaire", fid)}
                removeLabel={t.removeFile}
                formatSize={taille}
                invalid={tropLourd}
                describedBy={filesDescribedBy}
              />
              <Depot
                name="photos"
                accept="image/*"
                title={t.dropPhotosTitle}
                text={t.dropPhotosText}
                formats={t.dropPhotosFormats}
                activeText={t.dropActive}
                files={photos}
                onAdd={(l) => ajouter("photos", l)}
                onRemove={(fid) => retirer("photos", fid)}
                removeLabel={t.removeFile}
                formatSize={taille}
                invalid={tropLourd}
                describedBy={filesDescribedBy}
              />
            </div>

            {fichiers.length > 0 && (
              <div className="mt-4">
                <div className="mb-1.5 flex items-center justify-between gap-3 text-xs text-moss">
                  <span id={id("taille")}>{t.sizeLabel}</span>
                  <span className={`tabular-nums ${tropLourd ? "font-semibold" : ""}`}>
                    {t.sizeUsage(taille(totalTaille), taille(MAX_TOTAL_SIZE))}
                  </span>
                </div>
                <div
                  className="tlf-meter"
                  data-over={tropLourd}
                  role="meter"
                  aria-labelledby={id("taille")}
                  aria-valuemin={0}
                  aria-valuemax={15}
                  aria-valuenow={Math.min(15, Math.round((totalTaille / (1024 * 1024)) * 10) / 10)}
                  aria-valuetext={t.sizeUsage(taille(totalTaille), taille(MAX_TOTAL_SIZE))}
                >
                  <span style={{ transform: `scaleX(${Math.min(1, totalTaille / MAX_TOTAL_SIZE)})` }} />
                </div>
              </div>
            )}
            {tropLourd && <ErrorText id={filesErrId}>{f.filesError}</ErrorText>}
            {rejet && <ErrorText id={id("rejet")}>{rejet}</ErrorText>}
          </div>
        </section>

        {/* ------------------------ 2. Vos coordonnées ------------------------ */}
        <section
          aria-labelledby={id("h1")}
          hidden={!visible(1)}
          className="tlf-stage mt-8"
          data-dir={enhanced && step === 1 ? dir : undefined}
        >
          <h2 id={id("h1")} ref={(el) => void (headingRefs.current[1] = el)} tabIndex={-1} className="tlf-stage-title">
            {t.contactTitle}
          </h2>
          <p className="tlf-stage-hint">{t.contactHint}</p>

          <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div className="sm:col-span-2">
              {champ("nom", f.nameLabel, { autoComplete: "name", placeholder: f.namePlaceholder }, true)}
            </div>
            {champ(
              "courriel",
              f.emailLabel,
              { type: "email", inputMode: "email", autoComplete: "email", placeholder: f.emailPlaceholder },
              true,
            )}
            {champ(
              "telephone",
              f.phoneLabel,
              { type: "tel", inputMode: "tel", autoComplete: "tel", placeholder: f.phonePlaceholder },
              true,
            )}
          </div>
          <div className="my-6 h-px bg-line" aria-hidden="true" />
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            {champ("entreprise", t.companyLabel, { autoComplete: "organization", placeholder: t.companyPlaceholder }, false)}
            {champ("ville", t.cityLabel, { autoComplete: "address-level2", placeholder: t.cityPlaceholder }, false)}
          </div>
        </section>

        {/* ----------------------------- 3. Envoi ----------------------------- */}
        <section
          aria-labelledby={id("h2")}
          hidden={!visible(2)}
          className="tlf-stage mt-8"
          data-dir={enhanced && step === 2 ? dir : undefined}
        >
          <h2 id={id("h2")} ref={(el) => void (headingRefs.current[2] = el)} tabIndex={-1} className="tlf-stage-title">
            {t.reviewTitle}
          </h2>
          <p className="tlf-stage-hint">{t.reviewHint}</p>

          {enhanced && (
            <dl className="tlf-review mt-6">
              <div>
                <dt>
                  {t.reviewMaterial}
                  <EditButton label={t.edit} section={t.reviewMaterial} onClick={() => allerA(0)} disabled={loading} />
                </dt>
                <dd>
                  {choisies.length > 0 || autres.length > 0 ? (
                    <ul className="space-y-0.5">
                      {choisies.map((c) => (
                        <li key={c}>
                          {t.categories[c]} <span className="text-moss">·</span>{" "}
                          <span className="font-semibold tabular-nums">{quantites[c] ?? t.qtyUnknown}</span>
                        </li>
                      ))}
                      {autres.map((a) => (
                        <li key={a.id}>
                          {a.nom.trim() || t.otherUnnamed} <span className="text-moss">·</span>{" "}
                          <span className="font-semibold tabular-nums">{a.qte ?? t.qtyUnknown}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <span className="text-moss">{t.reviewNoMaterial}</span>
                  )}
                </dd>
              </div>
              {values.message.trim() && (
                <div>
                  <dt>{t.reviewDescription}</dt>
                  <dd className="tlf-clamp">{values.message.trim()}</dd>
                </div>
              )}
              <div>
                <dt>{t.reviewFiles}</dt>
                <dd>
                  {fichiers.length > 0 ? (
                    `${t.filesCount(fichiers.length)} · ${taille(totalTaille)}`
                  ) : (
                    <span className="text-moss">{t.reviewNoFiles}</span>
                  )}
                </dd>
              </div>
              <div>
                <dt>
                  {t.reviewContact}
                  <EditButton label={t.edit} section={t.reviewContact} onClick={() => allerA(1)} disabled={loading} />
                </dt>
                <dd>
                  <span className="font-semibold">{values.nom.trim()}</span>
                  {values.entreprise.trim() && <span className="text-moss"> · {values.entreprise.trim()}</span>}
                  <br />
                  {values.courriel.trim()}
                  <br />
                  {values.telephone.trim()}
                  {values.ville.trim() && <span className="text-moss"> · {values.ville.trim()}</span>}
                </dd>
              </div>
            </dl>
          )}

          {status === "error" && serverError && (
            <div className="tlf-alert mt-5" role="alert">
              <TriangleAlert className="h-4 w-4" aria-hidden="true" />
              <span>{serverError}</span>
            </div>
          )}
        </section>

        {/* ------------------------------ Navigation ------------------------------ */}
        <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
          {enhanced && step > 0 ? (
            <button type="button" onClick={() => allerA(step - 1)} disabled={loading} className="tl-btn tl-btn-md tl-btn-ghost tlf-btn">
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              {t.back}
            </button>
          ) : (
            <span className="hidden sm:block" />
          )}
          {enhanced && step < DERNIERE ? (
            <button type="button" onClick={suivant} className="tl-btn tl-btn-md tl-btn-primary tlf-btn">
              {t.next}
              <ArrowRight className="tl-btn-arrow" aria-hidden="true" />
            </button>
          ) : (
            <button type="submit" disabled={loading} className="tl-btn tl-btn-md tl-btn-primary tlf-btn">
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
                  {f.submitting}
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" aria-hidden="true" />
                  {f.submit}
                </>
              )}
            </button>
          )}
        </div>
        {(!enhanced || step === DERNIERE) && <p className="mt-4 text-xs leading-relaxed text-moss sm:text-right">{f.footnote}</p>}

        <p className="sr-only" aria-live="polite" aria-atomic="true">
          {annonce}
        </p>
      </form>
    </div>
  );
}

function ErrorText({ id, children }: { id: string; children: ReactNode }) {
  return (
    <p id={id} className="tlf-error">
      <CircleAlert className="h-3.5 w-3.5" aria-hidden="true" />
      <span>{children}</span>
    </p>
  );
}

function EditButton({
  label,
  section,
  onClick,
  disabled,
}: {
  label: string;
  section: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} className="tlf-link normal-case tracking-normal">
      <Pencil className="h-3 w-3" aria-hidden="true" />
      {label}
      <span className="sr-only"> — {section}</span>
    </button>
  );
}
