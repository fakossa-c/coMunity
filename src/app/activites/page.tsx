import type { Metadata } from "next";
import { Bientot } from "@/components/bientot";
import { BoutonFlottant } from "@/components/bouton-flottant";
import { EcranPrincipal } from "@/components/cadre";
import { CarteActivite, type Activite } from "@/components/carte-activite";
import { TitrePage } from "@/components/titre-page";
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
      <Onglets onglet={onglet} puce={puce} />
      {onglet === "j_organise" ? (
        <MesActivitesOrganisees puce={puce} />
      ) : puce === "a_venir" ? (
        <MesInscriptionsAVenir />
      ) : (
        <Bientot icone="diversity_3" />
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
    <ul aria-label={libelle} className="flex flex-col gap-space-sm">
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

  // Les dates sont celles de la base (UTC) : le même « aujourd'hui » que le catalogue de l'Accueil.
  const aujourdhui = new Date().toISOString().slice(0, 10);
  const toutes = data as Activite[];
  const activites =
    puce === "a_venir"
      ? toutes.filter((activite) => activite.date_activite >= aujourdhui)
      : toutes
          .filter((activite) => activite.date_activite < aujourdhui)
          .reverse();

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
