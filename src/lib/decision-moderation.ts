/** Ce que le conseil syndical décide d'une activité. */
export type Decision = "publier" | "refuser" | "masquer" | "retablir";

/** Ce que la liste de modération annonce après une décision : « « Vente de savons » est refusée. » */
export const CONFIRMATIONS: Record<Decision, (titre: string) => string> = {
  publier: (titre) => `« ${titre} » est publiée.`,
  refuser: (titre) => `« ${titre} » est refusée.`,
  masquer: (titre) => `« ${titre} » est masquée.`,
  retablir: (titre) => `« ${titre} » est rétablie.`,
};

/** Vrai si `valeur` est une décision : le paramètre `fait` de l'adresse n'est pas de confiance. */
export function estDecision(valeur: string | undefined): valeur is Decision {
  return valeur !== undefined && Object.hasOwn(CONFIRMATIONS, valeur);
}

/**
 * Vrai si la modération a mis l'activité de côté (en relecture ou masquée) : seuls son créateur et
 * le conseil syndical la voient, personne ne s'y inscrit, elle n'a pas de lien à partager et ne
 * s'annule pas avant d'être publiée.
 */
export function estMiseDeCote(statut: string | undefined) {
  return statut === "en_relecture" || statut === "masquee";
}
