import type { Metadata } from "next";
import { EcranSecondaire } from "@/components/cadre";
import { TitrePage } from "@/components/titre-page";
import { accesSyndic } from "../../acces";
import { FormulaireSection } from "../formulaire-section";

const RETOUR = { href: "/syndic/reglement", libelle: "Annuler" };

export const metadata: Metadata = { title: "Ajouter une section" };

export default async function NouvelleSection() {
  const { refus } = await accesSyndic("/syndic/reglement/nouvelle");
  if (refus) return <EcranSecondaire retour={RETOUR}>{refus}</EcranSecondaire>;

  return (
    <EcranSecondaire retour={RETOUR} actionDansLeFormulaire>
      <TitrePage
        titre="Ajouter une section"
        sousTitre="Elle prend la dernière place du règlement ; vous pourrez la remonter ensuite."
      />
      <FormulaireSection />
    </EcranSecondaire>
  );
}
