export const BUCKET_PHOTOS_PROFILS = "profils";

const UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";

/**
 * Le chemin de la photo d'un profil dans le bucket : le dossier du profil (c'est lui que les
 * politiques de Storage rattachent à la personne), puis un identifiant propre à la photo. Une photo
 * ne se remplace pas sur place : la nouvelle a un nouveau chemin, l'ancienne est retirée ensuite.
 * Toujours du JPEG, le format de sortie de la compression.
 */
export function cheminPhotoProfil(profil: string, photo: string) {
  return `${profil}/${photo}.jpg`;
}

/** Vrai pour un chemin que `cheminPhotoProfil` a pu produire pour ce profil : rien d'autre ne s'enregistre en base. */
export function estCheminPhotoProfil(chemin: string, profil: string) {
  // `profil` est validé avant d'entrer dans l'expression : il n'y a que des chiffres hexadécimaux et des tirets.
  return (
    new RegExp(`^${UUID}$`).test(profil) &&
    new RegExp(`^${profil}/${UUID}\\.jpg$`).test(chemin)
  );
}

/** Le texte alternatif de la photo d'un profil. */
export function texteAlternatifProfil(pseudo: string) {
  return `${pseudo}, photo de profil`;
}
