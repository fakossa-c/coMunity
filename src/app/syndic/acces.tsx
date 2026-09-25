import "server-only";
import { redirect } from "next/navigation";
import { Bientot } from "@/components/bientot";
import { TitrePage } from "@/components/titre-page";
import {
  estSyndicActif,
  estSyndicRetire,
  lireSession,
  type Session,
} from "@/lib/session";

/**
 * Vérifie, page par page, que la personne connectée est un membre actif du conseil syndical.
 * Sans session : direction la connexion, avec retour sur `chemin`.
 * Sinon : `refus` contient la page à afficher à la place.
 */
export async function accesSyndic(
  chemin: string,
): Promise<{ session: Session; refus: React.ReactNode }> {
  const session = await lireSession();
  if (!session) redirect(`/connexion?suivant=${encodeURIComponent(chemin)}`);
  if (estSyndicActif(session)) return { session, refus: null };

  return {
    session,
    refus: (
      <>
        <TitrePage titre="Espace syndic" sousTitre="Accès non autorisé" />
        <Bientot
          icone="lock"
          message={
            estSyndicRetire(session)
              ? "Votre accès à l'espace syndic a été retiré. Si c'est une erreur, adressez-vous à un membre du conseil syndical."
              : "Cet espace est réservé aux membres du conseil syndical."
          }
        />
      </>
    ),
  };
}
