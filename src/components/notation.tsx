"use client";

import { useId } from "react";

type Props = {
  /** Nom du groupe pour le lecteur d'écran : à l'écran, un `TitreSection` ou un libellé le précède. */
  libelle: string;
  valeur: number | null;
  onChange: (note: number) => void;
  disabled?: boolean;
};

/**
 * Note de 1 à 5, cases de 52 px sur fond bleu comme `ChoixSegmente` (2-3 options) mais pour un
 * choix à 5 valeurs : pas de fiche dédiée dans le design system à ce jour (#16). L'option active
 * passe en carte blanche bordée, comme le reste des choix exclusifs du système.
 */
export function Notation({
  libelle,
  valeur,
  onChange,
  disabled = false,
}: Props) {
  const nom = useId();
  return (
    <fieldset className="flex flex-col gap-space-xs" disabled={disabled}>
      <legend className="sr-only">{libelle}</legend>
      <div className="flex gap-1.5 rounded-md bg-surface-container p-1.5">
        {[1, 2, 3, 4, 5].map((note) => {
          const actif = note === valeur;
          return (
            <label
              key={note}
              className={`relative flex min-h-cible flex-1 cursor-pointer items-center justify-center rounded-md text-center font-headline text-label-lg has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-focus ${
                actif
                  ? "border-[1.5px] border-bordure-carte bg-fond-carte text-on-surface"
                  : "text-on-surface-variant"
              } ${disabled ? "cursor-not-allowed opacity-50" : ""}`}
            >
              <input
                type="radio"
                name={nom}
                value={note}
                checked={actif}
                disabled={disabled}
                onChange={() => onChange(note)}
                className="absolute inset-0 cursor-pointer opacity-0"
              />
              <span aria-hidden="true">{note}</span>
              <span className="sr-only"> : {note} sur 5</span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
