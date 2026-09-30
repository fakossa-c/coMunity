import { Bientot } from "@/components/bientot";
import { EcranSecondaire } from "@/components/cadre";
import { TitrePage } from "@/components/titre-page";

/** Lien d'annonce qui ne mène à rien : identifiant inconnu, ou annonce supprimée. */
export default function AnnonceIntrouvable() {
  return (
    <EcranSecondaire retour={{ href: "/", destination: "Accueil" }}>
      <TitrePage
        titre="Annonce introuvable"
        sousTitre="Ce lien ne mène à aucune annonce."
      />
      <Bientot
        icone="event_busy"
        message="Le conseil syndical l'a peut-être supprimée. Retrouvez les autres depuis l'onglet Annonces."
      />
    </EcranSecondaire>
  );
}
