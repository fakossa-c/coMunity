import { Bientot } from "@/components/bientot";
import { EcranSecondaire } from "@/components/cadre";
import { TitrePage } from "@/components/titre-page";

/** Lien d'activité qui ne mène à rien : identifiant inconnu, ou activité retirée de la vue. */
export default function ActiviteIntrouvable() {
  return (
    <EcranSecondaire retour={{ href: "/", libelle: "Accueil" }}>
      <TitrePage
        titre="Activité introuvable"
        sousTitre="Ce lien ne mène à aucune activité."
      />
      <Bientot
        icone="event_busy"
        message="Cette activité n'existe pas ou n'est plus visible : elle a peut-être été retirée. Retrouvez les activités de la résidence depuis l'accueil."
      />
    </EcranSecondaire>
  );
}
