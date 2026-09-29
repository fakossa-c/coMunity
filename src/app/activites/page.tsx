import type { Metadata } from "next";
import Link from "next/link";
import { Bientot } from "@/components/bientot";
import { BoutonFlottant } from "@/components/bouton-flottant";
import { EcranPrincipal } from "@/components/cadre";
import { classesBouton } from "@/components/bouton";
import { CarteActivite, type Activite } from "@/components/carte-activite";
import { Icone } from "@/components/icone";
import { TitrePage } from "@/components/titre-page";
import { aujourdhui, ordreChronologique } from "@/lib/partage-activite";
import { lireSession } from "@/lib/session";
import { clientSession } from "@/lib/supabase/serveur";
import { Onglets } from "./onglets";

export const metadata: Metadata = { title: "Activités" };

type Props = {
  searchParams: Promise<{ onglet?: string; puce?: string }>;
};

export default async function Activites({ searchParams }: Props) {
  const params = await searchParams;
  const onglet = params.onglet === "j_organise" ? "j_organise" : "j_y_vais";
  const puce = params.puce === "passees" ? "passees" : "a_venir";

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
      <Onglets onglet={onglet} puce={puce} />
      {onglet === "j_organise" ? (
        <MesActivitesOrganisees puce={puce} />
      ) : puce === "a_venir" ? (
        <MesInscriptionsAVenir />
      ) : (
        <MesInscriptionsPassees />
      )}
    </EcranPrincipal>
  );
}

function ListeActivites({
  libelle,
  activites,
}: {
  libelle: string;
  activites: Activite[];
}) {
  return (
    <ul
      aria-label={libelle}
      className="flex flex-col gap-space-sm desktop:grid desktop:grid-cols-2 desktop:items-start desktop:gap-bloc"
    >
      {activites.map((activite) => (
        <li key={activite.id}>
          <CarteActivite activite={activite} />
        </li>
      ))}
    </ul>
  );
}

/** Les activités où je suis inscrit, à venir, y compris celles que leur créateur a annulées. */
async function MesInscriptionsAVenir() {
  const session = await lireSession();
  if (!session) {
    return (
      <Bientot
        icone="diversity_3"
        message="Connectez-vous pour voir les activités où vous êtes inscrit."
      />
    );
  }

  const supabase = await clientSession();
  const { data, error } = await supabase.rpc("catalogue_activites");
  if (error)
    throw new Error(`Vos inscriptions sont illisibles : ${error.message}`);

  const inscriptions = (data as Activite[]).filter(
    (activite) => activite.mes_accompagnants != null,
  );

  if (inscriptions.length === 0) {
    return (
      <Bientot
        icone="diversity_3"
        message="Vous n'êtes inscrit à aucune activité à venir. Direction l'Accueil pour en découvrir."
      />
    );
  }

  return (
    <ListeActivites libelle="Vos activités à venir" activites={inscriptions} />
  );
}

/**
 * Les activités passées où j'étais inscrit, la plus récente d'abord. Celles que leur créateur a
 * annulées n'y figurent pas : on n'y est pas allé.
 */
async function MesInscriptionsPassees() {
  const session = await lireSession();
  if (!session) {
    return (
      <Bientot
        icone="diversity_3"
        message="Connectez-vous pour retrouver vos activités passées."
      />
    );
  }

  const supabase = await clientSession();
  const { data, error } = await supabase
    .from("inscription_activite")
    .select(
      "activite!inner(id, identifiant_public, titre, categorie, pictogramme, date_activite, heure_debut, lieu, etiquettes, statut)",
    )
    .eq("resident_id", session.id)
    .lt("activite.date_activite", aujourdhui())
    .neq("activite.statut", "annulee");
  if (error)
    throw new Error(`Vos activités passées sont illisibles : ${error.message}`);

  const activites = (data as unknown as { activite: Activite }[])
    .map(({ activite }) => activite)
    .sort((a, b) => ordreChronologique(b, a));

  if (activites.length === 0) {
    return (
      <Bientot
        icone="diversity_3"
        message="Les activités passées où vous aviez une place apparaîtront ici."
      />
    );
  }

  return (
    <ListeActivites libelle="Vos activités passées" activites={activites} />
  );
}

/**
 * Les activités que j'organise : à venir (la plus proche d'abord, annulées comprises) ou passées
 * (la plus récente d'abord). Le créateur les gère depuis leur fiche.
 */
async function MesActivitesOrganisees({
  puce,
}: {
  puce: "a_venir" | "passees";
}) {
  const session = await lireSession();
  if (!session) {
    return (
      <Bientot
        icone="diversity_3"
        message="Connectez-vous pour voir les activités que vous organisez."
      />
    );
  }

  const supabase = await clientSession();
  const { data, error } = await supabase.rpc("mes_activites_organisees");
  if (error)
    throw new Error(`Vos activités sont illisibles : ${error.message}`);

  const jour = aujourdhui();
  const toutes = data as Activite[];
  const activites =
    puce === "a_venir"
      ? toutes.filter((activite) => activite.date_activite >= jour)
      : toutes.filter((activite) => activite.date_activite < jour).reverse();

  if (activites.length === 0) {
    return (
      <Bientot
        icone="diversity_3"
        message={
          puce === "a_venir"
            ? "Vous n'organisez aucune activité à venir. Lancez-en une avec le bouton « Proposer »."
            : "Vos activités passées apparaîtront ici."
        }
      />
    );
  }

  return (
    <ListeActivites
      libelle={
        puce === "a_venir" ? "Vos activités à venir" : "Vos activités passées"
      }
      activites={activites}
    />
  );
}
