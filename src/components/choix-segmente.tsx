"use client";

import { useId } from "react";
import { Icone } from "./icone";
import type { NomIcone } from "./icones";

export type OptionSegmentee<Id extends string> = {
  id: Id;
  libelle: string;
  icone?: NomIcone;
};

type Props<Id extends string> = {
  /** Nom du groupe pour le lecteur d'écran : à l'écran, un `TitreSection` le précède. */
  libelle: string;
  options: OptionSegmentee<Id>[];
  valeur: Id;
  onChange: (id: Id) => void;
};

/**
 * Choix exclusif entre 2 ou 3 options, en cases de 64 px sur fond bleu. L'option active passe
 * en carte blanche bordée, icône pleine.
 */
export function ChoixSegmente<Id extends string>({
  libelle,
  options,
  valeur,
  onChange,
}: Props<Id>) {
  const nom = useId();
  return (
    <fieldset className="flex flex-col gap-space-xs">
      <legend className="sr-only">{libelle}</legend>
      <div className="flex gap-1.5 rounded-md bg-surface-container p-1.5">
        {options.map((option) => {
          const actif = option.id === valeur;
          return (
            <label
              key={option.id}
              className={`relative flex min-h-ligne flex-1 cursor-pointer flex-col items-center justify-center gap-1 rounded-md px-2 text-center font-headline text-label-md has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-focus ${
                actif
                  ? "border-[1.5px] border-bordure-carte bg-fond-carte text-on-surface"
                  : "text-on-surface-variant"
              }`}
            >
              <input
                type="radio"
                name={nom}
                value={option.id}
                checked={actif}
                onChange={() => onChange(option.id)}
                className="absolute inset-0 cursor-pointer opacity-0"
              />
              {option.icone && (
                <Icone nom={option.icone} plein={actif} taille={24} />
              )}
              {option.libelle}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
