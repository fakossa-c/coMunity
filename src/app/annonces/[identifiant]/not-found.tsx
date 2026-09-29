import { Bientot } from "@/components/bientot";
import { EcranSecondaire } from "@/components/cadre";
import { TitrePage } from "@/components/titre-page";

/** Lien d'annonce qui ne mène à rien : identifiant inconnu, ou annonce supprimée. */
export default function AnnonceIntrouvable() {
  return (
    <EcranSecondaire retour={{ href: "/", libelle: "Accueil" }}>
      <TitrePage
        titre="Annonce introuvable"
        sousTitre="Ce lien ne mène à aucune annonce."
      />
      <Bientot
        icone="event_busy"
        message="Cette annonce n'existe pas ou a été supprimée par le conseil syndical. Retrouvez les informations de la résidence depuis l'accueil."
      />
    </EcranSecondaire>
  );
}
