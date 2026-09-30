import type { Metadata } from "next";
import { EcranSecondaire, EcranSyndic } from "@/components/cadre";
import { TitrePage } from "@/components/titre-page";
import { accesSyndic } from "../../acces";
import { ColonneFormulaire } from "../../colonne-formulaire";
import { FormulaireSection } from "../formulaire-section";

const RETOUR = {
  href: "/syndic/reglement",
  destination: "Règlement intérieur",
};

export const metadata: Metadata = { title: "Ajouter une section" };

export default async function NouvelleSection() {
  const { refus } = await accesSyndic("/syndic/reglement/nouvelle");
  if (refus) return <EcranSecondaire retour={RETOUR}>{refus}</EcranSecondaire>;

  return (
    <EcranSyndic rubrique="reglement" retour={RETOUR} actionDansLeFormulaire>
      <ColonneFormulaire>
        <TitrePage
          titre="Ajouter une section"
          sousTitre="Elle prend la dernière place du règlement ; vous pourrez la remonter ensuite."
        />
        <FormulaireSection />
      </ColonneFormulaire>
    </EcranSyndic>
  );
}
