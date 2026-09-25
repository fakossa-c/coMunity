export const EMAIL_INCOMPLET =
  "Saisissez une adresse email complète, par exemple prenom.nom@exemple.fr.";

const FORMAT_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Pourquoi une adresse saisie est refusée, sous son champ ; `null` si elle a la forme d'un email. */
export function refusFormatEmail(
  adresse: string,
): { erreur: string; champ: "email" } | null {
  return FORMAT_EMAIL.test(adresse)
    ? null
    : { erreur: EMAIL_INCOMPLET, champ: "email" };
}
