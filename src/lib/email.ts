export const EMAIL_INCOMPLET =
  "Saisissez une adresse email complète, par exemple prenom.nom@exemple.fr.";

const FORMAT_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Pourquoi une adresse saisie est refusée ; `null` si elle a la forme d'un email. */
export function refusFormatEmail(adresse: string) {
  return FORMAT_EMAIL.test(adresse) ? null : EMAIL_INCOMPLET;
}
