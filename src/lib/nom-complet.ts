/** Aligné sur la contrainte de `profil.prenom` et `profil.nom` en base. */
export const LONGUEUR_MAXIMALE_NOM = 40;

type Identite = { prenom: string; nom: string };

/** « Colette Durand ». */
export function nomComplet(personne: Identite) {
  return `${personne.prenom} ${personne.nom}`;
}

const libelles = { prenom: "prénom", nom: "nom" } as const;

/**
 * Pourquoi un prénom et un nom saisis (déjà débarrassés de leurs espaces) sont refusés,
 * sous le champ concerné ; `null` s'ils conviennent.
 */
export function refusIdentite(
  identite: Identite,
): { erreur: string; champ: keyof Identite } | null {
  for (const champ of ["prenom", "nom"] as const) {
    if (!identite[champ]) {
      return { erreur: `Saisissez votre ${libelles[champ]}.`, champ };
    }
    if (identite[champ].length > LONGUEUR_MAXIMALE_NOM) {
      return {
        erreur: `Votre ${libelles[champ]} tient en ${LONGUEUR_MAXIMALE_NOM} caractères au plus.`,
        champ,
      };
    }
  }
  return null;
}
