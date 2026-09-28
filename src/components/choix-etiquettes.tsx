"use client";

import {
  etiquettesActivite,
  etiquettesActiviteListe,
  etiquettesDuGroupe,
  groupesEtiquettes,
  type EtiquetteActivite,
  type GroupeEtiquettes,
} from "@/lib/etiquettes-activite";
import { ChoixPastilles } from "./choix-pastilles";

type Props = {
  groupe: GroupeEtiquettes;
  valeurs: EtiquetteActivite[];
  onChange: (valeurs: EtiquetteActivite[]) => void;
};

/**
 * Une liste fermée d'étiquettes d'activité à cocher, en pastilles. La carte et la fiche montreront
 * ensuite l'étiquette dans le ton de son groupe.
 */
export function ChoixEtiquettes({ groupe, valeurs, onChange }: Props) {
  const duGroupe = etiquettesDuGroupe(groupe);
  const autres = valeurs.filter((v) => !duGroupe.includes(v));
  return (
    <ChoixPastilles
      titre={groupesEtiquettes[groupe].titre}
      options={duGroupe.map((cle) => ({ cle, ...etiquettesActivite[cle] }))}
      valeurs={valeurs.filter((v) => duGroupe.includes(v))}
      // Les étiquettes des autres groupes sont gardées, dans l'ordre des listes fermées.
      onChange={(choisies) =>
        onChange(
          etiquettesActiviteListe.filter((v) =>
            [...autres, ...choisies].includes(v),
          ),
        )
      }
    />
  );
}
