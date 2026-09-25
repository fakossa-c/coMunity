import type { ReactNode } from "react";
import {
  etiquettesActivite,
  tonEtiquette,
  type EtiquetteActivite,
} from "@/lib/etiquettes-activite";
import { Icone } from "./icone";
import type { NomIcone } from "./icones";

const tons = {
  /** Accessibilité, confort. */
  vert: "bg-fond-confirme text-texte-confirme",
  /** Familles, enfants. */
  abricot: "bg-tertiary-fixed text-on-tertiary-fixed",
  peche: "bg-fond-action text-texte-action",
};

export type TonEtiquette = keyof typeof tons;

type Props = { ton?: TonEtiquette; icone?: NomIcone; children: ReactNode };

/** Pastille pastel : badge d'accessibilité ou de public d'une activité, sur la carte et la fiche. */
export function Etiquette({ ton = "peche", icone, children }: Props) {
  return (
    <span
      className={`inline-flex min-h-8 items-center gap-1.5 rounded-full py-1 pr-3.5 pl-2.5 font-headline text-etiquette font-bold ${tons[ton]}`}
    >
      {icone && <Icone nom={icone} taille={20} />}
      {children}
    </span>
  );
}

/** Les étiquettes cochées d'une activité, dans l'ordre des listes fermées. Rien si aucune. */
export function EtiquettesActivite({
  etiquettes,
}: {
  etiquettes: EtiquetteActivite[];
}) {
  if (etiquettes.length === 0) return null;
  return (
    <ul aria-label="Étiquettes" className="flex flex-wrap gap-space-sm">
      {etiquettes.map((cle) => (
        <li key={cle}>
          <Etiquette
            ton={tonEtiquette(cle)}
            icone={etiquettesActivite[cle].icone}
          >
            {etiquettesActivite[cle].libelle}
          </Etiquette>
        </li>
      ))}
    </ul>
  );
}
