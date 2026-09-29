import type { Metadata } from "next";
import { EcranSecondaire } from "@/components/cadre";
import { TitrePage } from "@/components/titre-page";
import { accesSyndic } from "../../acces";
import { FormulaireEspace } from "../formulaire-espace";

const RETOUR = { href: "/syndic/espaces-communs", libelle: "Annuler" };

export const metadata: Metadata = { title: "Ajouter un espace commun" };

export default async function NouvelEspaceCommun() {
  const { refus } = await accesSyndic("/syndic/espaces-communs/nouveau");
  if (refus)
    return (
      <EcranSecondaire retour={RETOUR} pleineLargeur>
        {refus}
      </EcranSecondaire>
    );

  return (
    <EcranSecondaire retour={RETOUR} actionDansLeFormulaire pleineLargeur>
      <TitrePage
        titre="Ajouter un espace commun"
        sousTitre="Seul le nom est obligatoire ; le reste aide les voisins et l'assistant."
      />
      <FormulaireEspace />
    </EcranSecondaire>
  );
}
