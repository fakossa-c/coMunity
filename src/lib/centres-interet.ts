/** Aligné sur la contrainte de `centre_interet.libelle` en base. */
export const LONGUEUR_MAXIMALE_INTERET = 40;

export type CentreInteret = { id: string; libelle: string };

/** La forme sous laquelle deux libellés se comparent : sans casse, sans accents ni espaces autour. */
function comparable(libelle: string) {
  return libelle
    .trim()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}

/**
 * Pourquoi un libellé de centre d'intérêt est refusé ; `null` s'il convient. `modifie` est le centre
 * d'intérêt en cours de modification : il peut garder son libellé, à la casse près.
 */
export function refusInteret(
  libelle: string,
  existants: CentreInteret[],
  modifie?: string,
) {
  const saisi = libelle.trim();
  if (!saisi) return "Saisissez un centre d'intérêt.";
  if (saisi.length > LONGUEUR_MAXIMALE_INTERET) {
    return `Un centre d'intérêt tient en ${LONGUEUR_MAXIMALE_INTERET} caractères au plus.`;
  }
  const double = existants.some(
    (e) => e.id !== modifie && comparable(e.libelle) === comparable(saisi),
  );
  return double ? "Vous avez déjà déclaré ce centre d'intérêt." : null;
}
