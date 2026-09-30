export const BUCKET_PHOTOS_ACTIVITE = "activites";
/** Photos par activité, la même limite que la base. */
export const MAX_PHOTOS = 5;
/** Poids maximal d'une photo compressée, en octets : la limite du bucket. */
export const TAILLE_MAX_PHOTO = 2 * 1024 * 1024;

const UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";

/**
 * Le chemin d'une photo dans le bucket : le dossier de son activité (c'est lui que les politiques
 * de Storage rattachent au créateur), puis un identifiant propre à la photo. Toujours du JPEG,
 * le format de sortie de la compression.
 */
export function cheminPhoto(activite: string, photo: string) {
  return `${activite}/${photo}.jpg`;
}

/** Vrai pour un chemin que `cheminPhoto` a pu produire pour cette activité : rien d'autre ne s'enregistre en base. */
export function estCheminPhoto(chemin: string, activite: string) {
  // `activite` est validé avant d'entrer dans l'expression : il n'y a que des chiffres hexadécimaux et des tirets.
  return (
    new RegExp(`^${UUID}$`).test(activite) &&
    new RegExp(`^${activite}/${UUID}\\.jpg$`).test(chemin)
  );
}

/** L'adresse publique d'une photo, celle que la page et l'aperçu du lien affichent. */
export function urlPhoto(urlSupabase: string, chemin: string) {
  return `${urlSupabase}/storage/v1/object/public/${BUCKET_PHOTOS_ACTIVITE}/${chemin}`;
}

/** « 1 sur 4 » : la pastille de la galerie. */
export function compteurPhoto(rang: number, total: number) {
  return `${rang} sur ${total}`;
}

/** Le texte alternatif d'une photo : le titre de l'activité, puis son rang quand il y en a plusieurs. */
export function texteAlternatif(titre: string, rang: number, total: number) {
  return total > 1
    ? `${titre}, photo ${compteurPhoto(rang, total)}`
    : `${titre}, photo de l'activité`;
}

/** La liste avec l'élément d'indice `index` en tête ; la première photo est l'image de la carte. */
export function mettreEnPremier<T>(liste: T[], index: number) {
  return [liste[index], ...liste.filter((_, i) => i !== index)];
}

/** La liste sans l'élément d'indice `index`. */
export function retirerPhoto<T>(liste: T[], index: number) {
  return liste.filter((_, i) => i !== index);
}

/** « Aucune photo », « 1 photo », « 4 photos ». */
export function libellePhotos(nombre: number) {
  if (nombre === 0) return "Aucune photo";
  return nombre === 1 ? "1 photo" : `${nombre} photos`;
}

/**
 * Ce que dit le parcours d'une activité publiée dont les photos ne sont pas toutes enregistrées :
 * `echecs` photos n'ont pas pu être envoyées, ou bien (`enregistrees` faux) toutes sont parties
 * mais la liste n'a pas pu être enregistrée.
 */
export function messagePhotosIncompletes(
  echecs: number,
  enregistrees: boolean,
) {
  const [cause, pluriel] =
    !enregistrees && echecs === 0
      ? ["ses photos n'ont pas pu être enregistrées", true]
      : echecs === 1
        ? ["une photo n'a pas pu être envoyée", false]
        : [`${echecs} photos n'ont pas pu être envoyées`, true];
  return `Votre activité est publiée, mais ${cause}. Ouvrez l'activité puis « Modifier » pour ${pluriel ? "les " : "l'"}ajouter.`;
}
