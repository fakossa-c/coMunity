import { BarreFiltres } from "@/components/barre-filtres";
import { PuceFiltre } from "@/components/puce-filtre";
import type { NomIcone } from "@/components/icones";
import type { FiltreAnnonce } from "@/lib/annonces";

const PUCES: { id: FiltreAnnonce; libelle: string; icone?: NomIcone }[] = [
  { id: "toutes", libelle: "Toutes" },
  { id: "assemblees", libelle: "Assemblées", icone: "groups" },
  { id: "sondages", libelle: "Sondages", icone: "how_to_vote" },
  { id: "travaux-infos", libelle: "Travaux et infos", icone: "construction" },
];

/**
 * Les puces de l'onglet Annonces, collées en haut de l'écran : Toutes, Assemblées, Sondages, Travaux et infos.
 * Sur ordinateur, la rangée passe à la ligne faute de place : elle ne défile jamais.
 */
export function Filtres({ filtre }: { filtre: FiltreAnnonce }) {
  return (
    <BarreFiltres libelle="Types d'annonce">
      <div className="contents desktop:flex desktop:min-w-0 desktop:flex-1 desktop:flex-wrap desktop:gap-3">
        {PUCES.map(({ id, libelle, icone }) => (
          <PuceFiltre
            key={id}
            categorie
            neutre
            icone={icone}
            selectionnee={filtre === id}
            href={id === "toutes" ? "/annonces" : `/annonces?filtre=${id}`}
          >
            {libelle}
          </PuceFiltre>
        ))}
      </div>
    </BarreFiltres>
  );
}
