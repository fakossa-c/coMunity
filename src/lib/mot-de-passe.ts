/** Aligné sur `minimum_password_length` de Supabase Auth (supabase/config.toml). */
export const LONGUEUR_MINIMALE_MOT_DE_PASSE = 6;

export const MOT_DE_PASSE_TROP_FAIBLE = `Ce mot de passe est trop faible : au moins ${LONGUEUR_MINIMALE_MOT_DE_PASSE} caractères.`;

type RefusMotDePasse = {
  erreur: string;
  champ: "mot-de-passe" | "confirmation";
};

/**
 * Pourquoi un nouveau mot de passe et sa confirmation sont refusés, sous le champ concerné ;
 * `null` s'ils conviennent.
 */
export function refusNouveauMotDePasse(
  motDePasse: string,
  confirmation: string,
): RefusMotDePasse | null {
  if (motDePasse.length < LONGUEUR_MINIMALE_MOT_DE_PASSE) {
    return {
      erreur: `Choisissez un mot de passe d'au moins ${LONGUEUR_MINIMALE_MOT_DE_PASSE} caractères.`,
      champ: "mot-de-passe",
    };
  }
  if (motDePasse !== confirmation) {
    return {
      erreur: "Les deux mots de passe ne sont pas identiques.",
      champ: "confirmation",
    };
  }
  return null;
}

/**
 * Le refus de Supabase Auth sur le nouveau mot de passe, sous son champ ; `null` pour toute autre
 * erreur, dont l'écran garde le message. `precedent` nomme le mot de passe remplacé.
 */
export function refusMotDePasseAuth(
  code: string | undefined,
  precedent: "l'ancien" | "l'actuel",
): RefusMotDePasse | null {
  if (code === "same_password") {
    return {
      erreur: `Choisissez un mot de passe différent de ${precedent}.`,
      champ: "mot-de-passe",
    };
  }
  if (code === "weak_password") {
    return { erreur: MOT_DE_PASSE_TROP_FAIBLE, champ: "mot-de-passe" };
  }
  return null;
}
