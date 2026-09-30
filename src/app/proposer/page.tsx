import type { Metadata } from "next";
import { Bientot } from "@/components/bientot";
import { EcranSecondaire } from "@/components/cadre";
import { TitrePage } from "@/components/titre-page";
import { lireFiche } from "@/lib/fiche-activite";
import { espaceDeLAdresse, saisieDeCopie } from "@/lib/proposition-activite";
import { lireContexteParcours } from "@/lib/regles-residence";
import { clientSession } from "@/lib/supabase/serveur";
import { ParcoursProposition } from "./parcours";

export const metadata: Metadata = { title: "Proposer" };

type Props = {
  searchParams: Promise<{ copie?: string; espace?: string }>;
};

export default async function Proposer({ searchParams }: Props) {
  const { copie, espace } = await searchParams;
  const supabase = await clientSession();
  const { data: peutParticiper } = await supabase.rpc("peut_participer");

  // « Dupliquer » et « Utiliser comme modèle » : le parcours repart de l'activité, sans sa date.
  // Seuls son créateur et le conseil syndical la copient ; le lien d'une autre activité, ou d'une
  // activité qui n'existe pas, ouvre un parcours vide.
  const modele = peutParticiper && copie ? await lireFiche(copie) : null;
  const { data: conseilSyndical } = modele
    ? await supabase.rpc("est_syndic")
    : { data: false };
  const copiee =
    modele && (modele.est_organisateur || conseilSyndical) ? modele : null;
  const contexte = peutParticiper ? await lireContexteParcours() : null;

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
      {contexte ? (
        <ParcoursProposition
          key={copiee?.identifiant_public ?? "nouvelle"}
          espaces={contexte.espaces}
          regles={contexte.regles}
          initial={copiee ? saisieDeCopie(copiee) : undefined}
          // « Proposer une activité ici », depuis la fiche d'un espace commun : ce lieu est déjà
          // choisi. Un identifiant inconnu est ignoré, et une copie garde le lieu de l'original.
          espaceInitial={
            copiee ? "" : espaceDeLAdresse(contexte.espaces, espace)
          }
          pageUnique
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
