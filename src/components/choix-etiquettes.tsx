"use client";

import {
  etiquettesActivite,
  etiquettesDuGroupe,
  groupesEtiquettes,
  type EtiquetteActivite,
  type GroupeEtiquettes,
} from "@/lib/etiquettes-activite";
import { Icone } from "./icone";

const tonsCoches = {
  vert: "bg-fond-confirme text-texte-confirme",
  abricot: "bg-tertiary-fixed text-on-tertiary-fixed",
};

type Props = {
  groupe: GroupeEtiquettes;
  valeurs: EtiquetteActivite[];
  onChange: (valeurs: EtiquetteActivite[]) => void;
};

/**
 * Une liste fermée d'étiquettes à cocher : chaque option est une pastille, blanche bordée au
 * repos, pastel avec sa coche une fois choisie (sélection = passage au pastel plein + coche).
 */
export function ChoixEtiquettes({ groupe, valeurs, onChange }: Props) {
  const { titre, ton } = groupesEtiquettes[groupe];

  function basculer(cle: EtiquetteActivite, cochee: boolean) {
    // L'ordre des listes fermées est conservé, quel que soit l'ordre des clics.
    const suivantes = cochee
      ? [...valeurs, cle]
      : valeurs.filter((v) => v !== cle);
    onChange(
      etiquettesDuGroupe("accessibilite")
        .concat(etiquettesDuGroupe("pour_qui"))
        .filter((v) => suivantes.includes(v)),
    );
  }

  return (
    <fieldset className="flex flex-col gap-space-sm">
      <legend className="mb-space-xs font-headline text-label-lg">
        {titre}
      </legend>
      <div className="flex flex-wrap gap-space-sm">
        {etiquettesDuGroupe(groupe).map((cle) => {
          const cochee = valeurs.includes(cle);
          return (
            <label
              key={cle}
              className={`relative inline-flex min-h-cible cursor-pointer items-center gap-1.5 rounded-full py-2 pr-4 pl-3 font-headline text-label-md has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-focus ${
                cochee
                  ? tonsCoches[ton]
                  : "border-2 border-bordure-carte bg-fond-carte text-on-surface"
              }`}
            >
              <input
                type="checkbox"
                className="absolute inset-0 cursor-pointer opacity-0"
                checked={cochee}
                onChange={(e) => basculer(cle, e.target.checked)}
              />
              <Icone
                nom={cochee ? "check" : etiquettesActivite[cle].icone}
                taille={20}
              />
              {etiquettesActivite[cle].libelle}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
