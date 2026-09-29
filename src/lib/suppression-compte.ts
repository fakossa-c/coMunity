import type { SupabaseClient } from "@supabase/supabase-js";
import { BUCKET_PHOTOS_ACTIVITE } from "./photos-activite";

/**
 * Retire du bucket `activites` le dossier entier de chaque activité, photos jamais enregistrées
 * comprises (envoi resté en plan). À appeler avec le client du serveur, après la suppression du
 * compte : plus aucune session n'a alors le droit d'y toucher. Au pire, un fichier orphelin reste
 * dans le bucket, sans plus aucune activité pour le montrer.
 */
export async function retirerPhotosDesActivites(
  client: SupabaseClient,
  activites: string[],
) {
  const dossier = client.storage.from(BUCKET_PHOTOS_ACTIVITE);
  for (const activite of activites) {
    const { data: fichiers } = await dossier.list(activite);
    if (fichiers && fichiers.length > 0) {
      await dossier.remove(fichiers.map((f) => `${activite}/${f.name}`));
    }
  }
}
