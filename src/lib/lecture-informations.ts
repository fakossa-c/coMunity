import "server-only";
import { BUCKET_PHOTOS_PROFILS } from "./photo-profil";
import { clientSession } from "./supabase/serveur";

/** Le profil de la personne connectée tel que Mes informations le montre. */
export type InformationsLues = {
  pseudo: string | null;
  prenom: string | null;
  nom: string | null;
  telephone: string | null;
  batiment: string | null;
  etage: number | null;
  telephone_visible: boolean;
  batiment_visible: boolean;
  etage_visible: boolean;
  photo_chemin: string | null;
  /** L'adresse signée de la photo ; absente sans photo, ou quand elle n'a pas pu être signée. */
  photo?: string;
};

/** Durée de validité de l'adresse de la photo : le temps de lire la page, une heure de marge. */
const VALIDITE_PHOTO_SECONDES = 60 * 60;

/** Lit le profil de la personne connectée, avec l'adresse signée de sa photo (le bucket est privé). */
export async function lireInformations(
  id: string,
): Promise<InformationsLues | null> {
  const supabase = await clientSession();
  const { data } = await supabase
    .from("profil")
    .select(
      "pseudo, prenom, nom, telephone, batiment, etage, telephone_visible, batiment_visible, etage_visible, photo_chemin",
    )
    .eq("id", id)
    .maybeSingle();
  if (!data) return null;

  if (!data.photo_chemin) return data;
  const { data: signee } = await supabase.storage
    .from(BUCKET_PHOTOS_PROFILS)
    .createSignedUrl(data.photo_chemin, VALIDITE_PHOTO_SECONDES);
  return { ...data, photo: signee?.signedUrl };
}
