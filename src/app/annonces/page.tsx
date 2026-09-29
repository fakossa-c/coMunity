import type { Metadata } from "next";
import { Bientot } from "@/components/bientot";
import { EcranPrincipal } from "@/components/cadre";
import { CarteAnnonce } from "@/components/carte-annonce";
import { TitrePage } from "@/components/titre-page";
import { cheminAnnonce, filtreAnnonce } from "@/lib/annonces";
import { origine } from "@/lib/fiche-activite";
import {
  lireAnnoncesDuMoment,
  lireSondages,
  urlFichierAnnonce,
} from "@/lib/lecture-annonces";
import { lireSession } from "@/lib/session";
import { Filtres } from "./filtres";
import { SondageAnnonce } from "./sondage-annonce";

export const metadata: Metadata = { title: "Annonces" };

type Props = { searchParams: Promise<{ filtre?: string }> };

export default async function Annonces({ searchParams }: Props) {
  const filtre = filtreAnnonce((await searchParams).filtre);

  return (
    <EcranPrincipal onglet="annonces">
      <TitrePage
        titre="Annonces"
        sousTitre="Les informations du conseil syndical"
      />
      <Filtres filtre={filtre} />
      <ListeAnnonces filtre={filtre} />
    </EcranPrincipal>
  );
}

async function ListeAnnonces({
  filtre,
}: {
  filtre: ReturnType<typeof filtreAnnonce>;
}) {
  const session = await lireSession();
  if (!session) {
    return (
      <Bientot
        icone="campaign"
        message="Connectez-vous pour lire les annonces de la résidence."
      />
    );
  }

  const annonces = await lireAnnoncesDuMoment(filtre);
  if (annonces.length === 0) {
    return (
      <Bientot
        icone="campaign"
        message={
          filtre === "toutes"
            ? "Aucune annonce pour le moment. Les informations du conseil syndical apparaîtront ici."
            : "Aucune annonce de ce type pour le moment."
        }
      />
    );
  }

  const racine = await origine();
  const sondages = await lireSondages(
    annonces.filter((a) => a.type === "sondage").map((a) => a.id),
  );
  return (
    <ul aria-label="Annonces" className="flex flex-col gap-space-md">
      {annonces.map((annonce) => {
        const sondage = sondages.get(annonce.id);
        return (
          <li key={annonce.id}>
            <CarteAnnonce
              annonce={annonce}
              lien={`${racine}${cheminAnnonce(annonce.identifiant_public)}`}
              urlDocument={
                annonce.document_chemin
                  ? urlFichierAnnonce(annonce.document_chemin)
                  : undefined
              }
            >
              {sondage && (
                <SondageAnnonce
                  lu={sondage}
                  peutRepondre={session.statut === "valide"}
                />
              )}
            </CarteAnnonce>
          </li>
        );
      })}
    </ul>
  );
}
