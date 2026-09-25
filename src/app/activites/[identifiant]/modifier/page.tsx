import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { EcranSecondaire } from "@/components/cadre";
import { TitrePage } from "@/components/titre-page";
import { lireFiche } from "@/lib/fiche-activite";
import { cheminFiche } from "@/lib/partage-activite";
import { saisieDepuisActivite } from "@/lib/proposition-activite";
import { ParcoursProposition } from "@/app/proposer/parcours";

export const metadata: Metadata = { title: "Modifier" };

type Props = { params: Promise<{ identifiant: string }> };

/** Modifier une activité : le parcours de création, pré-rempli. Réservé à son créateur, hors activité annulée. */
export default async function Modifier({ params }: Props) {
  const { identifiant } = await params;
  const fiche = await lireFiche(identifiant);
  if (!fiche || !fiche.est_organisateur || fiche.statut === "annulee") {
    notFound();
  }

  return (
    <EcranSecondaire
      retour={{ href: cheminFiche(identifiant), libelle: "Annuler" }}
      actionDansLeFormulaire
    >
      <TitrePage titre="Modifier" sousTitre={fiche.titre} />
      <ParcoursProposition
        initial={saisieDepuisActivite(fiche)}
        modification={{ identifiant, placesPrises: fiche.places_prises }}
      />
    </EcranSecondaire>
  );
}
