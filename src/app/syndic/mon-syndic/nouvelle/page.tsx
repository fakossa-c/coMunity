import type { Metadata } from "next";
import { EcranSecondaire, EcranSyndic } from "@/components/cadre";
import { TitrePage } from "@/components/titre-page";
import { lireComptesReliables } from "@/lib/lecture-fiches-syndic";
import { accesSyndic } from "../../acces";
import { ColonneFormulaire } from "../../colonne-formulaire";
import { FormulaireFiche } from "../formulaire-fiche";

const RETOUR = { href: "/syndic/mon-syndic", destination: "Mon syndic" };

export const metadata: Metadata = { title: "Ajouter une fiche" };

export default async function NouvelleFiche() {
  const { refus } = await accesSyndic("/syndic/mon-syndic/nouvelle");
  if (refus) return <EcranSecondaire retour={RETOUR}>{refus}</EcranSecondaire>;

  return (
    <EcranSyndic rubrique="mon-syndic" retour={RETOUR} actionDansLeFormulaire>
      <ColonneFormulaire>
        <TitrePage
          titre="Ajouter une fiche"
          sousTitre="Elle prend la dernière place de Mon syndic ; vous pourrez la remonter ensuite."
        />
        <FormulaireFiche comptes={await lireComptesReliables()} />
      </ColonneFormulaire>
    </EcranSyndic>
  );
}
