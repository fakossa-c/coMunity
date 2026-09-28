import {
  categoriesActivite,
  type CategorieActivite,
} from "./categories-activite";
import { jourLong, ordreChronologique } from "./partage-activite";

/** Les activités d'un même jour, sous leur intertitre (« Aujourd’hui », « Mardi 27 octobre »). */
export type JourActivites<T> = {
  date: string;
  titre: string;
  aujourdhui: boolean;
  activites: T[];
};

/**
 * Les activités groupées par jour, dans l'ordre chronologique. `aujourdhui` est la date du jour
 * au format `AAAA-MM-JJ`, celle de la base (UTC), comme le « à venir » du catalogue.
 */
export function grouperParJour<
  T extends { date_activite: string; heure_debut: string },
>(activites: T[], aujourdhui: string): JourActivites<T>[] {
  const triees = [...activites].sort(ordreChronologique);
  const jours: JourActivites<T>[] = [];
  for (const activite of triees) {
    const dernier = jours.at(-1);
    if (dernier?.date === activite.date_activite) {
      dernier.activites.push(activite);
    } else {
      const estAujourdhui = activite.date_activite === aujourdhui;
      jours.push({
        date: activite.date_activite,
        titre: estAujourdhui ? "Aujourd’hui" : jourLong(activite.date_activite),
        aujourdhui: estAujourdhui,
        activites: [activite],
      });
    }
  }
  return jours;
}

/** Le dimanche qui termine la semaine de `date` (elle-même si c'est un dimanche). */
function dimancheDe(date: string) {
  const jour = new Date(`${date}T00:00:00Z`);
  const joursRestants = (7 - jour.getUTCDay()) % 7;
  jour.setUTCDate(jour.getUTCDate() + joursRestants);
  return jour.toISOString().slice(0, 10);
}

/**
 * Le nombre d'activités prévues « cette semaine » : d'aujourd'hui à dimanche inclus, sans les
 * activités annulées. Seule définition de la semaine de la salutation.
 */
export function activitesDeLaSemaine(
  activites: { date_activite: string; statut?: string }[],
  aujourdhui: string,
) {
  const dimanche = dimancheDe(aujourdhui);
  return activites.filter(
    (activite) =>
      activite.statut !== "annulee" &&
      activite.date_activite >= aujourdhui &&
      activite.date_activite <= dimanche,
  ).length;
}

/** « 4 activités prévues cette semaine », « 1 activité prévue… », « Aucune activité prévue… ». */
export function resumeSemaine(nombre: number) {
  if (nombre === 0) return "Aucune activité prévue cette semaine";
  return nombre === 1
    ? "1 activité prévue cette semaine"
    : `${nombre} activités prévues cette semaine`;
}

/** La catégorie choisie dans les puces de l'Accueil, ou `null` pour « Toutes ». */
export function categorieFiltree(valeur?: string): CategorieActivite | null {
  return valeur && Object.hasOwn(categoriesActivite, valeur)
    ? (valeur as CategorieActivite)
    : null;
}
