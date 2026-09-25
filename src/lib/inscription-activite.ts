/** Ce qu'il faut d'une activité pour calculer sa jauge. */
export type JaugeActivite = {
  /** `null` : pas de limite de participants. */
  capaciteMax: number | null;
  placesPrises: number;
};

/** Les places encore ouvertes, ou `null` si l'activité n'a pas de capacité. */
export function placesRestantesDe({ capaciteMax, placesPrises }: JaugeActivite) {
  return capaciteMax === null ? null : capaciteMax - placesPrises;
}

/** Vrai quand l'activité n'a plus de place. Une activité sans capacité n'est jamais complète. */
export function estComplete(jauge: JaugeActivite) {
  const restantes = placesRestantesDe(jauge);
  return restantes !== null && restantes <= 0;
}

/** « 8 inscrits sur 12 places », « 8 inscrits » sans capacité, « Aucun inscrit » à zéro. */
export function libelleJauge({ capaciteMax, placesPrises }: JaugeActivite) {
  const inscrits =
    placesPrises === 0
      ? "Aucun inscrit"
      : placesPrises === 1
        ? "1 inscrit"
        : `${placesPrises} inscrits`;
  return capaciteMax === null ? inscrits : `${inscrits} sur ${capaciteMax} places`;
}

/** « avec 2 personnes », « avec 1 personne », ou `null` sans accompagnant. */
export function libelleAccompagnants(accompagnants: number) {
  if (accompagnants === 0) return null;
  return accompagnants === 1
    ? "avec 1 personne"
    : `avec ${accompagnants} personnes`;
}

/** « Je participe », « Je participe, avec 2 personnes ». */
export function libelleBoutonInscription(accompagnants: number) {
  const suffixe = libelleAccompagnants(accompagnants);
  return suffixe ? `Je participe, ${suffixe}` : "Je participe";
}

/** « J'y vais », « J'y vais, avec 2 personnes » : le statut d'un résident déjà inscrit. */
export function libelleStatutInscription(accompagnants: number) {
  const suffixe = libelleAccompagnants(accompagnants);
  return suffixe ? `J'y vais, ${suffixe}` : "J'y vais";
}
