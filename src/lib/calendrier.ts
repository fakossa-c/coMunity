// Le calendrier de Proposer raisonne en dates `AAAA-MM-JJ` et en mois `AAAA-MM`, toujours en UTC :
// aucun fuseau ne décale un jour.

const JOUR_MS = 24 * 60 * 60 * 1000;

const FORMAT_MOIS = new Intl.DateTimeFormat("fr-FR", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

const FORMAT_JOUR = new Intl.DateTimeFormat("fr-FR", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

function enDate(date: string) {
  return new Date(`${date}T00:00:00Z`);
}

function enTexte(date: Date) {
  return date.toISOString().slice(0, 10);
}

/** Le mois d'une date : « 2026-10-24 » donne « 2026-10 ». */
export function moisDe(date: string) {
  return date.slice(0, 7);
}

/** Le mois qui suit (`decalage` positif) ou précède (négatif). */
export function moisDecale(mois: string, decalage: number) {
  const [annee, numero] = mois.split("-").map(Number);
  return enTexte(new Date(Date.UTC(annee, numero - 1 + decalage, 1))).slice(
    0,
    7,
  );
}

function majusculeInitiale(texte: string) {
  return texte.charAt(0).toUpperCase() + texte.slice(1);
}

/** « Octobre 2026 ». */
export function libelleMois(mois: string) {
  return majusculeInitiale(FORMAT_MOIS.format(enDate(`${mois}-01`)));
}

/** Position dans la semaine, 0 pour le lundi et 6 pour le dimanche. */
function rangDansLaSemaine(date: string) {
  return (enDate(date).getUTCDay() + 6) % 7;
}

/**
 * Les semaines d'un mois, du lundi au dimanche. Les jours des mois voisins sont des cases vides
 * (`null`) : la grille n'offre que les jours du mois affiché.
 */
export function semainesDuMois(mois: string) {
  const premier = `${mois}-01`;
  const nombreDeJours = new Date(
    Date.UTC(Number(mois.slice(0, 4)), Number(mois.slice(5)), 0),
  ).getUTCDate();
  const cases: (string | null)[] = Array.from(
    { length: rangDansLaSemaine(premier) },
    () => null,
  );
  for (let jour = 1; jour <= nombreDeJours; jour++)
    cases.push(`${mois}-${String(jour).padStart(2, "0")}`);
  while (cases.length % 7 !== 0) cases.push(null);

  return Array.from({ length: cases.length / 7 }, (_, i) =>
    cases.slice(i * 7, i * 7 + 7),
  );
}

/** Le jour `jours` plus loin (négatif : plus tôt), d'un mois sur l'autre. */
export function jourDecale(date: string, jours: number) {
  return enTexte(new Date(enDate(date).getTime() + jours * JOUR_MS));
}

/** Le lundi de la semaine du jour. */
export function debutDeSemaine(date: string) {
  return jourDecale(date, -rangDansLaSemaine(date));
}

/** Le dimanche de la semaine du jour. */
export function finDeSemaine(date: string) {
  return jourDecale(date, 6 - rangDansLaSemaine(date));
}

/** « samedi 24 octobre 2026 » : ce que le lecteur d'écran annonce pour un jour. */
export function libelleJour(date: string) {
  return FORMAT_JOUR.format(enDate(date));
}
