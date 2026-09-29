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
