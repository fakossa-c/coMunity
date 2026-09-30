import type { Metadata } from "next";
import { EcranSecondaire, EcranSyndic } from "@/components/cadre";
import { TitrePage } from "@/components/titre-page";
import { saisieCopie } from "@/lib/annonces";
import { lireAnnonce, lireSondageDeLAnnonce } from "@/lib/lecture-annonces";
import { saisieSondageCopie } from "@/lib/sondages";
import { accesSyndic } from "../../acces";
import { ColonneFormulaire } from "../../colonne-formulaire";
import { FormulaireAnnonce } from "../formulaire-annonce";

const RETOUR = { href: "/syndic/annonces", destination: "Annonces" };

export const metadata: Metadata = { title: "Publier une annonce" };

type Props = { searchParams: Promise<{ copie?: string }> };

export default async function PublierUneAnnonce({ searchParams }: Props) {
  const { copie } = await searchParams;
  const { refus } = await accesSyndic("/syndic/annonces/nouvelle");
  if (refus) return <EcranSecondaire retour={RETOUR}>{refus}</EcranSecondaire>;

  const original = copie ? await lireAnnonce(copie) : null;
  const sondage = original ? await lireSondageDeLAnnonce(original.id) : null;

  return (
    <EcranSyndic rubrique="annonces" retour={RETOUR} actionDansLeFormulaire>
      <ColonneFormulaire>
        <TitrePage
          titre="Publier une annonce"
          sousTitre={
            original
              ? `Copie de « ${original.titre} » : ajustez ce qui change, puis publiez.`
              : "Les résidents la liront dans l'onglet Annonces, et vous pourrez partager son lien."
          }
        />
        <FormulaireAnnonce
          annonce={
            original
              ? {
                  saisie: saisieCopie(original),
                  sondage: sondage ? saisieSondageCopie(sondage) : undefined,
                }
              : undefined
          }
        />
      </ColonneFormulaire>
    </EcranSyndic>
  );
}
