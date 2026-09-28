"use client";

import { Icone } from "./icone";
import type { NomIcone } from "./icones";

export type OptionPastille<C extends string> = {
  cle: C;
  libelle: string;
  icone: NomIcone;
};

type Props<C extends string> = {
  titre: string;
  /** Les options, dans l'ordre de la liste fermée. */
  options: OptionPastille<C>[];
  valeurs: C[];
  onChange: (valeurs: C[]) => void;
};

/**
 * Une liste fermée à cocher : chaque option est une pastille, blanche bordée au repos, pêche
 * avec sa coche une fois choisie (sélection = passage au pêche plein + coche). L'ordre de la
 * liste est conservé, quel que soit l'ordre des clics.
 */
export function ChoixPastilles<C extends string>({
  titre,
  options,
  valeurs,
  onChange,
}: Props<C>) {
  function basculer(cle: C, cochee: boolean) {
    const suivantes = cochee
      ? [...valeurs, cle]
      : valeurs.filter((v) => v !== cle);
    onChange(options.map((o) => o.cle).filter((v) => suivantes.includes(v)));
  }

  return (
    <fieldset className="flex flex-col gap-space-sm">
      <legend className="mb-space-xs font-headline text-label-lg">
        {titre}
      </legend>
      <div className="flex flex-wrap gap-space-sm">
        {options.map(({ cle, libelle, icone }) => {
          const cochee = valeurs.includes(cle);
          return (
            <label
              key={cle}
              className={`relative inline-flex min-h-cible cursor-pointer items-center gap-1.5 rounded-full py-2 pr-4 pl-3 font-headline text-label-md has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-focus ${
                cochee
                  ? "bg-fond-action text-texte-action"
                  : "border-2 border-bordure-carte bg-fond-carte text-on-surface"
              }`}
            >
              <input
                type="checkbox"
                className="absolute inset-0 cursor-pointer opacity-0"
                checked={cochee}
                onChange={(e) => basculer(cle, e.target.checked)}
              />
              <Icone nom={cochee ? "check" : icone} taille={20} />
              {libelle}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
