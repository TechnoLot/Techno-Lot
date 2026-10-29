"use client";

import { memo, useEffect, useRef, useState } from "react";
import { FileSpreadsheet, FileText, ImageIcon, ImagePlus, X } from "lucide-react";
import { creerApercu } from "./apercu";

export type FichierJoint = { id: string; file: File };

type Props = {
  /** Nom du champ attendu par /api/soumission */
  name: "inventaire" | "photos";
  accept: string;
  title: string;
  text: string;
  formats: string;
  activeText: string;
  files: FichierJoint[];
  onAdd: (files: File[]) => void;
  onRemove: (id: string) => void;
  removeLabel: (name: string) => string;
  formatSize: (bytes: number) => string;
  invalid?: boolean;
  describedBy?: string;
};

/**
 * Aperçu d'une photo : vignette réduite hors du fil principal (l'original reste
 * intact pour l'envoi). Tant qu'elle se prépare, la case reste vide, comme
 * pendant le décodage d'une grande image. L'URL est libérée au retrait.
 */
const Vignette = memo(function Vignette({ file }: { file: File }) {
  const [url, setUrl] = useState<string>();

  useEffect(() => {
    let actif = true;
    let cree: string | undefined;
    creerApercu(file).then((u) => {
      if (actif) setUrl((cree = u));
      else URL.revokeObjectURL(u);
    });
    return () => {
      actif = false;
      if (cree) URL.revokeObjectURL(cree);
    };
  }, [file]);

  return (
    <>
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element -- aperçu local (blob:)
        <img
          src={url}
          alt={file.name}
          onError={(e) => {
            e.currentTarget.style.display = "none";
            e.currentTarget.nextElementSibling?.removeAttribute("hidden");
          }}
        />
      ) : null}
      <span className="tlf-thumb-fallback" hidden>
        <ImageIcon className="h-6 w-6" aria-hidden="true" />
        <span className="sr-only">{file.name}</span>
      </span>
    </>
  );
});

/**
 * Zone de dépôt (glisser-déposer ou clic) avec aperçus et retrait par fichier.
 * Le vrai <input type="file"> reste dans un <label> : clavier et sans-JS fonctionnent.
 * Mémorisée : un changement ailleurs dans le formulaire ne la rend pas de nouveau.
 */
export const Depot = memo(function Depot({
  name,
  accept,
  title,
  text,
  formats,
  activeText,
  files,
  onAdd,
  onRemove,
  removeLabel,
  formatSize,
  invalid,
  describedBy,
}: Props) {
  const [over, setOver] = useState(false);
  const depth = useRef(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const isPhotos = name === "photos";

  function retirer(id: string, index: number) {
    onRemove(id);
    // Focus sur le bouton « retirer » voisin, sinon sur la zone de dépôt.
    requestAnimationFrame(() => {
      const buttons = listRef.current?.querySelectorAll<HTMLButtonElement>("button[data-remove]");
      const target = buttons?.[Math.min(index, (buttons?.length ?? 1) - 1)];
      (target ?? inputRef.current)?.focus();
    });
  }

  return (
    <div>
      <label
        className="tlf-drop"
        data-over={over}
        data-invalid={invalid ? "true" : undefined}
        onDragEnter={(e) => {
          e.preventDefault();
          depth.current += 1;
          setOver(true);
        }}
        onDragOver={(e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = "copy";
        }}
        onDragLeave={() => {
          depth.current = Math.max(0, depth.current - 1);
          if (depth.current === 0) setOver(false);
        }}
        onDrop={(e) => {
          e.preventDefault();
          depth.current = 0;
          setOver(false);
          const dropped = Array.from(e.dataTransfer.files ?? []);
          if (dropped.length) onAdd(dropped);
        }}
      >
        <input
          ref={inputRef}
          type="file"
          name={name}
          accept={accept}
          multiple
          className="sr-only"
          aria-describedby={describedBy}
          aria-invalid={invalid || undefined}
          onChange={(e) => {
            const picked = Array.from(e.target.files ?? []);
            // Les fichiers vivent dans l'état React ; on vide l'input pour pouvoir
            // re-choisir le même fichier après l'avoir retiré.
            e.target.value = "";
            if (picked.length) onAdd(picked);
          }}
        />
        <span className="tlf-drop-icon" aria-hidden="true">
          {isPhotos ? <ImagePlus className="h-5 w-5" /> : <FileSpreadsheet className="h-5 w-5" />}
        </span>
        <span className="tlf-drop-title">{title}</span>
        <span className="tlf-drop-text">{over ? activeText : text}</span>
        <span className="tlf-drop-formats">{formats}</span>
      </label>

      {files.length > 0 &&
        (isPhotos ? (
          <ul ref={listRef} className="tlf-thumbs">
            {files.map((f, i) => (
              <li key={f.id} className="tlf-thumb" title={`${f.file.name} · ${formatSize(f.file.size)}`}>
                <Vignette file={f.file} />
                <button
                  type="button"
                  data-remove=""
                  className="tlf-remove"
                  aria-label={removeLabel(f.file.name)}
                  onClick={() => retirer(f.id, i)}
                >
                  <X className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <ul ref={listRef} className="tlf-files">
            {files.map((f, i) => {
              const Icon = /\.(xlsx?|csv|ods)$/i.test(f.file.name) ? FileSpreadsheet : FileText;
              return (
                <li key={f.id} className="tlf-file">
                  <Icon className="tlf-file-icon h-5 w-5" aria-hidden="true" />
                  <span className="tlf-file-name">{f.file.name}</span>
                  <span className="tlf-file-size">{formatSize(f.file.size)}</span>
                  <button
                    type="button"
                    data-remove=""
                    className="tlf-remove"
                    aria-label={removeLabel(f.file.name)}
                    onClick={() => retirer(f.id, i)}
                  >
                    <X className="h-4 w-4" aria-hidden="true" />
                  </button>
                </li>
              );
            })}
          </ul>
        ))}
    </div>
  );
});
