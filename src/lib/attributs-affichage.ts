export type TailleAffichage = "standard" | "grands";
export type ThemeAffichage = "clair" | "sombre";

type Reglages = { taille: TailleAffichage; theme: ThemeAffichage } | null;

/**
 * Les attributs à poser sur la racine du document d'après les réglages d'affichage du profil,
 * pour que le thème sombre et les grands caractères s'appliquent sans flash au chargement.
 * Un visiteur non connecté, ou un compte aux valeurs par défaut, n'a aucun attribut : la taille
 * standard et le thème clair sont déjà l'état par défaut des tokens.
 */
export function attributsAffichage(reglages: Reglages) {
  const attributs: Record<string, string> = {};
  if (reglages?.taille === "grands") attributs["data-taille"] = "grands";
  if (reglages?.theme === "sombre") attributs["data-theme"] = "sombre";
  return attributs;
}
