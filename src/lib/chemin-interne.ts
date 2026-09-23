/**
 * Renvoie `valeur` si c'est un chemin de l'application, sinon `null`.
 * Sert au retour après connexion : un lien piégé ne doit pas renvoyer vers un autre site.
 */
export function cheminInterne(
  valeur: FormDataEntryValue | string | null | undefined,
): string | null {
  return null;
}
