import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { EcranSecondaire } from "@/components/cadre";
import { TitrePage } from "@/components/titre-page";
import { saisieDepuisAnnonce } from "@/lib/annonces";
import { lireAnnonce } from "@/lib/lecture-annonces";
import { accesSyndic } from "../../acces";
import { FormulaireAnnonce } from "../formulaire-annonce";

const RETOUR = { href: "/syndic/annonces", libelle: "Annuler" };

export const metadata: Metadata = { title: "Modifier une annonce" };

type Props = { params: Promise<{ id: string }> };

export default async function ModifierUneAnnonce({ params }: Props) {
  const { id } = await params;
  const { refus } = await accesSyndic(`/syndic/annonces/${id}`);
  if (refus)
    return (
      <EcranSecondaire retour={RETOUR} pleineLargeur>
        {refus}
      </EcranSecondaire>
    );

  const annonce = await lireAnnonce(id);
  if (!annonce) notFound();

  return (
    <EcranSecondaire retour={RETOUR} actionDansLeFormulaire pleineLargeur>
      <TitrePage titre="Modifier une annonce" sousTitre={annonce.titre} />
      <FormulaireAnnonce
        annonce={{ id: annonce.id, saisie: saisieDepuisAnnonce(annonce) }}
      />
    </EcranSecondaire>
  );
}
