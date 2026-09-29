// Les heures de Proposer se choisissent dans des listes, jamais au clavier. Elles s'écrivent
// `HH:MM`, comme en base ; le pas est de 15 minutes, de 06:00 à 23:45.

const PAS = 15;
const PREMIERE = 6 * 60;
const DERNIERE = 23 * 60 + 45;
const DUREE_PAR_DEFAUT = 90;

function enMinutes(heure: string) {
  const [heures, minutes] = heure.split(":").map(Number);
  return heures * 60 + minutes;
}

function enHeure(minutes: number) {
  const heures = String(Math.floor(minutes / 60)).padStart(2, "0");
  return `${heures}:${String(minutes % 60).padStart(2, "0")}`;
}

const HEURES = Array.from({ length: (DERNIERE - PREMIERE) / PAS + 1 }, (_, i) =>
  enHeure(PREMIERE + i * PAS),
);

/** Ajoute à la liste une heure hors du pas de 15 minutes (activité existante), à sa place. */
function avecHeure(heures: string[], actuelle: string) {
  if (!actuelle || heures.includes(actuelle)) return heures;
  return [...heures, actuelle].sort();
}

/**
 * Les heures de début proposées : jusqu'à 23:30, car une activité doit finir après avoir commencé.
 * `actuelle`, hors du pas de 15 minutes, reste choisissable.
 */
export function optionsDebut(actuelle: string) {
  return avecHeure(
    HEURES.filter((heure) => enMinutes(heure) < DERNIERE),
    actuelle,
  );
}

/** Les heures de fin proposées : celles qui suivent le début (toute la journée sans début). */
export function optionsFin(debut: string, actuelle: string) {
  return avecHeure(HEURES, actuelle).filter((heure) => !debut || heure > debut);
}

/**
 * La fin après un changement de début. Tant que la fin n'a pas été choisie, elle suit le début
 * (début plus 1 h 30) ; une fin choisie est gardée tant qu'elle reste après le début. Rien après
 * 23:45 : la fin est alors vide.
 */
export function finApresDebut(debut: string, fin: string, finChoisie: boolean) {
  if (!debut) return fin;
  if (finChoisie && fin > debut) return fin;
  const proposee = Math.min(enMinutes(debut) + DUREE_PAR_DEFAUT, DERNIERE);
  return proposee > enMinutes(debut) ? enHeure(proposee) : "";
}

/** « 14h30 », « 06h00 » : l'heure telle que la liste l'affiche. */
export function libelleHeure(heure: string) {
  return heure.replace(":", "h");
}
