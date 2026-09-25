import type { Metadata } from "next";
import { Bientot } from "@/components/bientot";
import { EcranSecondaire } from "@/components/cadre";
import { TitrePage } from "@/components/titre-page";
import { lireFiche } from "@/lib/fiche-activite";
import { saisieDeCopie } from "@/lib/proposition-activite";
import { clientSession } from "@/lib/supabase/serveur";
import { ParcoursProposition } from "./parcours";

export const metadata: Metadata = { title: "Proposer" };

type Props = { searchParams: Promise<{ copie?: string }> };

export default async function Proposer({ searchParams }: Props) {
  const { copie } = await searchParams;
  const supabase = await clientSession();
  const { data: peutParticiper } = await supabase.rpc("peut_participer");

  // « Dupliquer » : le parcours repart de l'activité du créateur, sans sa date. Le lien d'une
  // activité qui n'est pas la sienne, ou qui n'existe pas, ouvre un parcours vide.
  const modele = peutParticiper && copie ? await lireFiche(copie) : null;
  const copiee = modele?.est_organisateur ? modele : null;

  return (
    <EcranSecondaire
      retour={{ href: "/activites", libelle: "Annuler" }}
      actionDansLeFormulaire={Boolean(peutParticiper)}
    >
      <TitrePage
        titre="Proposer"
        sousTitre={
          copiee
            ? `Une nouvelle date pour « ${copiee.titre} »`
            : "Lancez une activité avec vos voisins"
        }
      />
      {peutParticiper ? (
        <ParcoursProposition
          key={copiee?.identifiant_public ?? "nouvelle"}
          initial={copiee ? saisieDeCopie(copiee) : undefined}
        />
      ) : (
        <Bientot
          icone="add_circle"
          message="Vous pourrez proposer une activité dès que votre compte sera validé par le conseil syndical."
        />
      )}
    </EcranSecondaire>
  );
}
