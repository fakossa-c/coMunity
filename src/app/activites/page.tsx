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
      {onglet === "j_y_vais" && puce === "a_venir" ? (
        <MesInscriptionsAVenir />
      ) : (
        <Bientot icone="diversity_3" />
      )}
    </EcranPrincipal>
  );
}

/** Les activités où je suis inscrit, à venir : ce que ce ticket (#8) remplit. */
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
    <ul aria-label="Vos activités à venir" className="flex flex-col gap-space-sm">
      {inscriptions.map((activite) => (
        <li key={activite.id}>
          <CarteActivite activite={activite} />
        </li>
      ))}
    </ul>
  );
}
