/**
 * Renvoie `valeur` si c'est un chemin de l'application, sinon `null`.
 * Sert au retour après connexion : un lien piégé ne doit pas renvoyer vers un autre site.
 */
export function cheminInterne(
  valeur: FormDataEntryValue | null | undefined,
): string | null {
  if (typeof valeur !== "string") return null;
  // « //site » et « /\site » sont lus par le navigateur comme une autre origine.
  if (!valeur.startsWith("/") || valeur[1] === "/" || valeur[1] === "\\") {
    return null;
  }
  return valeur;
}
