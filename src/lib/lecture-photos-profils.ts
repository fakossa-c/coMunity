import "server-only";
import { BUCKET_PHOTOS_PROFILS } from "./photo-profil";
import { clientSession } from "./supabase/serveur";

/** Durée de validité de l'adresse d'une photo : le temps de lire la page, une heure de marge. */
const VALIDITE_PHOTO_SECONDES = 60 * 60;

/**
 * L'adresse signée de chaque photo de profil, par chemin. Le bucket est privé : la base ne signe
 * que pour un compte qui consulte la résidence (validé, ou résident en attente) ou le conseil
 * syndical. Une photo dont l'adresse n'a pas pu être signée manque : l'initiale du pseudo reste.
 */
export async function adressesPhotosProfils(
  chemins: (string | null)[],
): Promise<Map<string, string>> {
  const adresses = new Map<string, string>();
  const aSigner = [...new Set(chemins.filter((c): c is string => c !== null))];
  if (aSigner.length === 0) return adresses;

  const supabase = await clientSession();
  const { data } = await supabase.storage
    .from(BUCKET_PHOTOS_PROFILS)
    .createSignedUrls(aSigner, VALIDITE_PHOTO_SECONDES);
  for (const { path, signedUrl } of data ?? [])
    if (path && signedUrl) adresses.set(path, signedUrl);
  return adresses;
}
