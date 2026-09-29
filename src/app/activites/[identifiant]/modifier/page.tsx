import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { EcranSecondaire } from "@/components/cadre";
import { TitrePage } from "@/components/titre-page";
import { adressePhoto, lireFiche } from "@/lib/fiche-activite";
import { cheminFiche } from "@/lib/partage-activite";
import { saisieDepuisActivite } from "@/lib/proposition-activite";
import { lireContexteParcours } from "@/lib/regles-residence";
import { estSyndicActif, lireSession } from "@/lib/session";
import { ParcoursProposition } from "@/app/proposer/parcours";

export const metadata: Metadata = { title: "Modifier" };

type Props = { params: Promise<{ identifiant: string }> };

/**
 * Modifier une activité : le parcours de création, pré-rempli. Réservé à son créateur tant qu'elle
 * est publiée, et au conseil syndical tant qu'elle n'est pas annulée.
 */
export default async function Modifier({ params }: Props) {
  const { identifiant } = await params;
  const fiche = await lireFiche(identifiant);
  if (!fiche) notFound();
  const modifiable = estSyndicActif(await lireSession())
    ? fiche.statut !== "annulee"
    : fiche.est_organisateur && fiche.statut === "publiee";
  if (!modifiable) notFound();
  const { espaces, regles } = await lireContexteParcours(identifiant);

  return (
    <EcranSecondaire
      retour={{ href: cheminFiche(identifiant), libelle: "Annuler" }}
      actionDansLeFormulaire
    >
      <TitrePage titre="Modifier" sousTitre={fiche.titre} />
      <ParcoursProposition
        espaces={espaces}
        regles={regles}
        initial={saisieDepuisActivite(fiche)}
        modification={{ identifiant, placesPrises: fiche.places_prises }}
        photosInitiales={fiche.photos.map((chemin) => ({
          chemin,
          url: adressePhoto(chemin),
        }))}
      />
    </EcranSecondaire>
  );
}
