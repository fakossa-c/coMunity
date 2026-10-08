import { BUCKET_PHOTOS_ACTIVITE } from "./photos-activite";
import { clientNavigateur } from "./supabase/navigateur";

/** Un dépôt autorisé par le serveur : le chemin du fichier et le jeton à usage unique de son envoi. */
type Depot = { chemin: string; token: string };

/**
 * Envoie un fichier vers son dépôt, directement depuis le navigateur. Le client Supabase se charge
 * ici, à l'envoi : un échec de ce chargement (réseau coupé) compte comme un envoi échoué. Rend
 * `true` quand le fichier est déposé.
 */
export async function deposerFichier(
  bucket: string,
  depot: Depot,
  fichier: Blob,
): Promise<boolean> {
  try {
    const supabase = await clientNavigateur();
    const { error } = await supabase.storage
      .from(bucket)
      .uploadToSignedUrl(depot.chemin, depot.token, fichier, {
        contentType: fichier.type,
      });
    return !error;
  } catch {
    return false;
  }
}

/**
 * Envoie chaque photo compressée vers son dépôt. Rend, dans le même ordre que `photos`, le chemin
 * de la photo envoyée ou `null` quand son envoi a échoué (ou qu'aucun dépôt ne lui était
 * autorisé) : les autres photos partent quand même. Le bucket est celui des photos d'activité,
 * sauf indication contraire.
 */
export async function envoyerPhotos(
  depots: Depot[],
  photos: Blob[],
  bucket = BUCKET_PHOTOS_ACTIVITE,
): Promise<(string | null)[]> {
  return Promise.all(
    photos.map(async (photo, i) => {
      const depot = depots[i];
      if (!depot) return null;
      return (await deposerFichier(bucket, depot, photo)) ? depot.chemin : null;
    }),
  );
}
