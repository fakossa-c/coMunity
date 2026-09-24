/** Aligné sur la contrainte de `profil.prenom` et `profil.nom` en base. */
export const LONGUEUR_MAXIMALE_NOM = 40;

/** « Colette Durand ». */
export function nomComplet(personne: { prenom: string; nom: string }) {
  return `${personne.prenom} ${personne.nom}`;
}
