import type { Metadata } from "next";
import { Bientot } from "@/components/bientot";
import { EcranPrincipal } from "@/components/cadre";
import { CarteAnnonce } from "@/components/carte-annonce";
import { TitrePage } from "@/components/titre-page";
import { cheminAnnonce, filtreAnnonce } from "@/lib/annonces";
import { origine } from "@/lib/fiche-activite";
import {
  lireAnnoncesDuMoment,
  urlFichierAnnonce,
} from "@/lib/lecture-annonces";
import { lireSession } from "@/lib/session";
import { Filtres } from "./filtres";

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
  if (!(await lireSession())) {
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
  return (
    <ul aria-label="Annonces" className="flex flex-col gap-space-md">
      {annonces.map((annonce) => (
        <li key={annonce.id}>
          <CarteAnnonce
            annonce={annonce}
            lien={`${racine}${cheminAnnonce(annonce.identifiant_public)}`}
            urlDocument={
              annonce.document_chemin
                ? urlFichierAnnonce(annonce.document_chemin)
                : undefined
            }
          />
        </li>
      ))}
    </ul>
  );
}
