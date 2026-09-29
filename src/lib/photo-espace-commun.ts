export const BUCKET_PHOTOS_ESPACES = "espaces-communs";

const UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";

/**
 * Le chemin d'une photo d'espace commun dans le bucket : un identifiant propre à la photo, à la
 * racine. Une photo ne se remplace pas sur place : la nouvelle a un nouveau chemin, l'ancienne
 * est retirée ensuite. Toujours du JPEG, le format de sortie de la compression.
 */
export function cheminPhotoEspace(photo: string) {
  return `${photo}.jpg`;
}

/** Vrai pour un chemin que `cheminPhotoEspace` a pu produire : rien d'autre ne s'enregistre en base. */
export function estCheminPhotoEspace(chemin: string) {
  return new RegExp(`^${UUID}\\.jpg$`).test(chemin);
}

/** Le texte alternatif de la photo d'un espace commun. */
export function texteAlternatifEspace(nom: string) {
  return `${nom}, photo de l'espace commun`;
}
