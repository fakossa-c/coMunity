import type { Metadata } from "next";
import { EcranSecondaire, EcranSyndic } from "@/components/cadre";
import { TitrePage } from "@/components/titre-page";
import { accesSyndic } from "../../acces";
import { FormulaireEspace } from "../formulaire-espace";

const RETOUR = {
  href: "/syndic/espaces-communs",
  destination: "Espaces communs",
};

export const metadata: Metadata = { title: "Ajouter un espace commun" };

export default async function NouvelEspaceCommun() {
  const { refus } = await accesSyndic("/syndic/espaces-communs/nouveau");
  if (refus) return <EcranSecondaire retour={RETOUR}>{refus}</EcranSecondaire>;

  return (
    <EcranSyndic
      rubrique="espaces-communs"
      retour={RETOUR}
      actionDansLeFormulaire
    >
      <TitrePage
        titre="Ajouter un espace commun"
        sousTitre="Seul le nom est obligatoire ; le reste aide les voisins et l'assistant."
      />
      <FormulaireEspace />
    </EcranSyndic>
  );
}
