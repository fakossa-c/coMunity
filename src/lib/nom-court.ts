/**
 * Nom affiché sous l'icône de l'app installée, où une douzaine de caractères seulement
 * tiennent : « Résidence Les Tilleuls » devient « Les Tilleuls ».
 */
export function nomCourt(nom: string): string {
  const complet = nom.trim();
  return complet.replace(/^résidence\s+/i, "") || complet;
}
