import { BUCKET_PHOTOS_ACTIVITE } from "./photos-activite";
import { clientNavigateur } from "./supabase/navigateur";

/** Un dépôt autorisé par le serveur : le chemin de la photo et le jeton à usage unique de son envoi. */
type Depot = { chemin: string; token: string };

/**
 * Envoie chaque photo compressée vers son dépôt, directement depuis le navigateur. Rend, dans le
 * même ordre que `photos`, le chemin de la photo envoyée ou `null` quand son envoi a échoué (ou
 * qu'aucun dépôt ne lui était autorisé) : les autres photos partent quand même.
 */
export async function envoyerPhotos(
  depots: Depot[],
  photos: Blob[],
): Promise<(string | null)[]> {
  const supabase = clientNavigateur();
  return Promise.all(
    photos.map(async (photo, i) => {
      const depot = depots[i];
      if (!depot) return null;
      const { error } = await supabase.storage
        .from(BUCKET_PHOTOS_ACTIVITE)
        .uploadToSignedUrl(depot.chemin, depot.token, photo, {
          contentType: photo.type,
        });
      return error ? null : depot.chemin;
    }),
  );
}
