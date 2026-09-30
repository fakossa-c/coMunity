import type { Metadata } from "next";
import Link from "next/link";
import { Bientot } from "@/components/bientot";
import { BoutonFlottant } from "@/components/bouton-flottant";
import { EcranPrincipal } from "@/components/cadre";
import { classesBouton } from "@/components/bouton";
import { CarteActivite, type Activite } from "@/components/carte-activite";
import { Icone } from "@/components/icone";
import { LigneArchivee } from "@/components/ligne-archivee";
import { TitrePage } from "@/components/titre-page";
import { lireMesActivites } from "@/lib/lecture-mes-activites";
import { lireSession } from "@/lib/session";
import { ongletDemande, SegmentsActivites } from "./onglets";

export const metadata: Metadata = { title: "Activités" };

type Props = {
  searchParams: Promise<{ onglet?: string }>;
};

export default async function Activites({ searchParams }: Props) {
  const { onglet } = await searchParams;
  const actif = ongletDemande(onglet);
  const session = await lireSession();

  return (
    <EcranPrincipal
      onglet="activites"
      flottant={<BoutonFlottant href="/proposer">Proposer</BoutonFlottant>}
    >
      <TitrePage
        titre="Activités"
        sousTitre="Vos inscriptions et vos propositions"
      />
      {/* Sur ordinateur, le bouton flottant est remplacé par ce bouton sous le titre. */}
      <div className="mb-space-md hidden desktop:block">
        <Link href="/proposer" className={classesBouton("action")}>
          <Icone nom="add" taille={24} />
          Proposer une activité
        </Link>
      </div>
      {session ? (
        <MesActivites residentId={session.id} actif={actif} />
      ) : (
        <Bientot
          icone="diversity_3"
          message="Connectez-vous pour retrouver vos activités."
        />
      )}
    </EcranPrincipal>
  );
}

/** Les trois segments et la liste de celui qui est ouvert. */
async function MesActivites({
  residentId,
  actif,
}: {
  residentId: string;
  actif: ReturnType<typeof ongletDemande>;
}) {
  const { jeParticipe, jOrganise, archivees } =
    await lireMesActivites(residentId);

  return (
    <>
      <SegmentsActivites
        actif={actif}
        compteurs={{
          je_participe: jeParticipe.length,
          j_organise: jOrganise.length,
          archivees: archivees.length,
        }}
      />
      {actif === "archivees" ? (
        archivees.length === 0 ? (
          <Bientot
            icone="history"
            message="Vos activités passées, organisées ou suivies, apparaîtront ici."
          />
        ) : (
          <ul
            aria-label="Activités archivées"
            className="flex flex-col divide-y-[1.5px] divide-bordure-carte rounded-lg border-[1.5px] border-bordure-carte bg-fond-carte p-1.5 desktop:p-3"
          >
            {archivees.map(({ activite, role }) => (
              <li key={activite.id}>
                <LigneArchivee activite={activite} role={role} />
              </li>
            ))}
          </ul>
        )
      ) : actif === "j_organise" ? (
        <ListeActivites
          libelle="Activités que vous organisez"
          activites={jOrganise}
          colonnes={2}
          messageVide="Vous n'organisez aucune activité à venir. Lancez-en une avec le bouton « Proposer »."
        />
      ) : (
        <ListeActivites
          libelle="Activités où vous participez"
          activites={jeParticipe}
          colonnes={3}
          messageVide="Vous n'êtes inscrit à aucune activité à venir. Direction l'Accueil pour en découvrir."
        />
      )}
    </>
  );
}

/**
 * Des cartes d'activité : une colonne sur mobile ; sur ordinateur, trois colonnes (inscriptions)
 * ou deux (activités organisées, qui portent leur état et leur jauge).
 */
function ListeActivites({
  libelle,
  activites,
  colonnes,
  messageVide,
}: {
  libelle: string;
  activites: Activite[];
  colonnes: 2 | 3;
  messageVide: string;
}) {
  if (activites.length === 0)
    return <Bientot icone="diversity_3" message={messageVide} />;

  return (
    <ul
      aria-label={libelle}
      className={`flex flex-col gap-space-sm desktop:grid desktop:items-start desktop:gap-x-8 desktop:gap-y-6 ${
        colonnes === 3 ? "desktop:grid-cols-3" : "desktop:grid-cols-2"
      }`}
    >
      {activites.map((activite) => (
        <li key={activite.id}>
          <CarteActivite activite={activite} />
        </li>
      ))}
    </ul>
  );
}
