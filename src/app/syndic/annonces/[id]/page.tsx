import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { EcranSecondaire, EcranSyndic } from "@/components/cadre";
import { TitrePage } from "@/components/titre-page";
import { saisieDepuisAnnonce } from "@/lib/annonces";
import { lireAnnonce, lireSondageDeLAnnonce } from "@/lib/lecture-annonces";
import { accesSyndic } from "../../acces";
import { ColonneFormulaire } from "../../colonne-formulaire";
import { FormulaireAnnonce } from "../formulaire-annonce";

const RETOUR = { href: "/syndic/annonces", destination: "Annonces" };

export const metadata: Metadata = { title: "Modifier une annonce" };

type Props = { params: Promise<{ id: string }> };

export default async function ModifierUneAnnonce({ params }: Props) {
  const { id } = await params;
  const { refus } = await accesSyndic(`/syndic/annonces/${id}`);
  if (refus) return <EcranSecondaire retour={RETOUR}>{refus}</EcranSecondaire>;

  const annonce = await lireAnnonce(id);
  if (!annonce) notFound();
  const sondage = await lireSondageDeLAnnonce(annonce.id);

  return (
    <EcranSyndic rubrique="annonces" retour={RETOUR} actionDansLeFormulaire>
      <ColonneFormulaire>
        <TitrePage titre="Modifier une annonce" sousTitre={annonce.titre} />
        <FormulaireAnnonce
          annonce={{
            id: annonce.id,
            saisie: saisieDepuisAnnonce(annonce),
            sondagePublie: sondage ?? undefined,
          }}
        />
      </ColonneFormulaire>
    </EcranSyndic>
  );
}
