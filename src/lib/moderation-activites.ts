import "server-only";
import type { StatutActivite } from "@/components/etat-activite";
import type { CategorieActivite } from "./categories-activite";
import { clientSession } from "./supabase/serveur";

/** Une activité mise de côté par la modération, comme la liste du conseil syndical la lit. */
export type ActiviteAModerer = {
  identifiant_public: string;
  titre: string;
  categorie: CategorieActivite;
  pictogramme: string;
  date_activite: string;
  heure_debut: string;
  lieu: string;
  statut: Extract<StatutActivite, "en_relecture" | "masquee">;
  /** Pourquoi elle a été mise en relecture ; `null` pour une activité masquée d'emblée. */
  raison_relecture: string | null;
  /** Le message de la dernière décision, celui que son créateur lit ; `null` sans message. */
  message_moderation: string | null;
  /** « Danielle M. » */
  organisateur_nom_affiche: string;
  publiee_le: string;
};

/**
 * Les activités à modérer : celles en relecture d'abord (la liste « À relire »), les masquées
 * ensuite. Rien pour qui n'est pas du conseil syndical.
 */
export async function lireActivitesAModerer(): Promise<ActiviteAModerer[]> {
  const supabase = await clientSession();
  const { data, error } = await supabase.rpc("activites_a_moderer");
  if (error)
    throw new Error(`Activités à modérer illisibles : ${error.message}`);
  return data as ActiviteAModerer[];
}
