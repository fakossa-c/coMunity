export const BUCKET_PHOTOS_ESPACES = "espaces-communs";

/** Photos par espace commun, la même limite que la base. */
export const MAX_PHOTOS_ESPACE = 5;

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

/** Le texte alternatif d'une photo d'un espace commun : son rang, quand il y en a plusieurs. */
export function texteAlternatifEspace(nom: string, rang = 1, total = 1) {
  return total > 1
    ? `${nom}, photo ${rang} sur ${total}`
    : `${nom}, photo de l'espace commun`;
}

/** Le texte alternatif du plan de situation d'un espace commun. */
export function texteAlternatifPlan(nom: string) {
  return `Plan de situation de ${nom}`;
}

/** La liste avec l'élément d'indice `index` décalé de `decalage` rangs ; inchangée au bout de la liste. */
export function deplacerPhoto<T>(liste: T[], index: number, decalage: number) {
  const cible = index + decalage;
  if (cible < 0 || cible >= liste.length) return liste;
  const copie = [...liste];
  [copie[index], copie[cible]] = [copie[cible], copie[index]];
  return copie;
}
