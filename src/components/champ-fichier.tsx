"use client";

import { useId, useState } from "react";
import { Bouton } from "./bouton";

type Props = {
  libelle: string;
  aide?: string;
  /** Types acceptés par le sélecteur de fichiers : « application/pdf ». */
  accept: string;
  /** Le fichier choisi, pas encore envoyé. */
  fichier: File | null;
  /** Le nom du fichier déjà enregistré, quand il n'y en a pas de nouveau. */
  nomActuel?: string | null;
  erreur?: string;
  onChoisir: (fichier: File) => void;
  onRetirer: () => void;
};

/**
 * Choix d'un fichier joint, à l'allure d'un `Champ` : le sélecteur natif, puis le nom du fichier
 * retenu avec son bouton « Retirer ». Le fichier part à l'enregistrement du formulaire.
 */
export function ChampFichier({
  libelle,
  aide,
  accept,
  fichier,
  nomActuel,
  erreur,
  onChoisir,
  onRetirer,
}: Props) {
  const id = useId();
  // Changer la clé vide le sélecteur : rechoisir le même fichier après l'avoir retiré déclenche `onChange`.
  const [cle, setCle] = useState(0);
  const nom = fichier?.name ?? nomActuel;

  return (
    <div className="flex flex-col gap-space-xs">
      <label htmlFor={id} className="font-headline text-label-lg">
        {libelle}
      </label>
      <input
        key={cle}
        id={id}
        type="file"
        accept={accept}
        aria-describedby={aide ? `${id}-aide` : undefined}
        aria-invalid={erreur ? true : undefined}
        onChange={(e) => {
          const choisi = e.target.files?.[0];
          if (choisi) onChoisir(choisi);
        }}
        className={`min-h-champ w-full rounded-md border-[1.5px] bg-fond-carte px-4 py-2 font-body text-body-lg text-on-surface file:mr-3 file:min-h-cible file:cursor-pointer file:rounded-full file:border-0 file:bg-fond-action file:px-4 file:font-headline file:text-label-lg file:text-texte-action ${erreur ? "border-error" : "border-outline"}`}
      />
      {aide && (
        <p id={`${id}-aide`} className="text-body-md text-on-surface-variant">
          {aide}
        </p>
      )}
      {nom && (
        <p className="flex flex-wrap items-center gap-space-sm text-body-lg text-on-surface">
          <span className="font-headline text-body-bold">{nom}</span>
          <Bouton
            variante="fantome"
            icone="close"
            iconeTaille={20}
            onClick={() => {
              setCle(cle + 1);
              onRetirer();
            }}
          >
            Retirer<span className="sr-only"> : {libelle}</span>
          </Bouton>
        </p>
      )}
      {erreur && (
        <p role="alert" className="font-headline text-label-lg text-error">
          {erreur}
        </p>
      )}
    </div>
  );
}
