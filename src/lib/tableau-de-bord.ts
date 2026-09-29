import {
  categoriesActivite,
  categoriesActiviteListe,
  type CategorieActivite,
} from "./categories-activite";
import type { Retour } from "./retour-activite";

/** Ce que renvoie la RPC `tableau_bord_synthese` : les volumes d'une période et l'état des comptes. */
export type Synthese = {
  nombre_activites: number;
  nombre_inscriptions: number;
  nombre_participants: number;
  activites_par_residents: number;
  activites_par_conseil: number;
  residents_valides: number;
  residents_en_attente: number;
};

export type DimensionRemplissage = "categorie" | "jour" | "creneau";

/** Une ligne de la RPC `tableau_bord_remplissage` : un groupe (une catégorie, un jour, une tranche horaire). */
export type LigneRemplissage = {
  dimension: DimensionRemplissage;
  cle: string;
  nombre_activites: number;
  taux_remplissage: number | null;
};

/** Une ligne de la RPC `tableau_bord_classement` : une activité bien notée et ses retours. */
export type LigneClassement = {
  identifiant_public: string;
  titre: string;
  categorie: CategorieActivite;
  date_activite: string;
  note_moyenne: number;
  nombre_retours: number;
  places_prises: number;
  commentaires: Retour[];
};

/** Une ligne de la RPC `tableau_bord_par_mois`. */
export type LigneMois = {
  mois: string;
  nombre_activites: number;
  nombre_participants: number;
};

export type Periode = { debut: string; fin: string };

export const PERIODES = [
  { cle: "30_jours", libelle: "30 derniers jours" },
  { cle: "3_mois", libelle: "3 derniers mois" },
  { cle: "12_mois", libelle: "12 derniers mois" },
  { cle: "annee", libelle: "Cette année" },
] as const;

export type ClePeriode = (typeof PERIODES)[number]["cle"];

export const PERIODE_PAR_DEFAUT: ClePeriode = "3_mois";

/** La période demandée dans l'adresse ; `3_mois` quand elle manque ou n'existe pas. */
export function clePeriode(valeur: string | undefined): ClePeriode {
  return PERIODES.find((p) => p.cle === valeur)?.cle ?? PERIODE_PAR_DEFAUT;
}

function iso(annee: number, mois: number, jour: number) {
  return new Date(Date.UTC(annee, mois, jour)).toISOString().slice(0, 10);
}

/**
 * Les bornes d'une période, jour de `aujourdhui` compris. Les périodes en mois commencent le 1er
 * du mois, mois en cours compris, pour que chaque barre de la courbe mensuelle soit un mois entier
 * (sauf le mois en cours) ; `30_jours` compte le jour même et les 29 précédents.
 */
export function periodeDe(cle: ClePeriode, aujourdhui: Date): Periode {
  const annee = aujourdhui.getFullYear();
  const mois = aujourdhui.getMonth();
  const jour = aujourdhui.getDate();
  const fin = iso(annee, mois, jour);
  switch (cle) {
    case "30_jours":
      return { debut: iso(annee, mois, jour - 29), fin };
    case "3_mois":
      return { debut: iso(annee, mois - 2, 1), fin };
    case "12_mois":
      return { debut: iso(annee, mois - 11, 1), fin };
    case "annee":
      return { debut: iso(annee, 0, 1), fin };
  }
}

const FORMAT_DATE_LONGUE = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

/** « Du 1 juillet 2026 au 29 septembre 2026 ». */
export function libellePeriode({ debut, fin }: Periode) {
  const ecrire = (date: string) =>
    FORMAT_DATE_LONGUE.format(new Date(`${date}T00:00:00Z`));
  return `Du ${ecrire(debut)} au ${ecrire(fin)}`;
}

const FORMAT_MOIS = new Intl.DateTimeFormat("fr-FR", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});
const FORMAT_MOIS_COURT = new Intl.DateTimeFormat("fr-FR", {
  month: "short",
  timeZone: "UTC",
});

/** « mars 2020 », ou « mars » en version courte, pour le premier jour d'un mois. */
export function libelleMois(mois: string, court = false) {
  const date = new Date(`${mois}T00:00:00Z`);
  return (court ? FORMAT_MOIS_COURT : FORMAT_MOIS).format(date);
}

/** « 65 % » (espace insécable), « 33,3 % », ou « Places non limitées » pour une activité sans capacité. */
export function libelleTaux(taux: number | null) {
  if (taux === null) return "Places non limitées";
  return `${taux.toString().replace(".", ",")} %`;
}

/** « 1 activité », « 3 activités », « Aucune activité ». */
export function libelleNombreActivites(nombre: number) {
  if (nombre === 0) return "Aucune activité";
  return nombre === 1 ? "1 activité" : `${nombre} activités`;
}

/** La part, en pourcentage entier, des activités créées par des résidents ; `null` sans activité. */
export function partActivitesResidents({
  activites_par_residents,
  activites_par_conseil,
}: Pick<Synthese, "activites_par_residents" | "activites_par_conseil">) {
  const total = activites_par_residents + activites_par_conseil;
  if (total === 0) return null;
  return Math.round((activites_par_residents / total) * 100);
}

/** Une barre du graphique de remplissage. `taux` est `null` sans activité à places limitées. */
export type Barre = {
  cle: string;
  libelle: string;
  nombreActivites: number;
  taux: number | null;
};

export const JOURS_SEMAINE = [
  ["1", "Lundi"],
  ["2", "Mardi"],
  ["3", "Mercredi"],
  ["4", "Jeudi"],
  ["5", "Vendredi"],
  ["6", "Samedi"],
  ["7", "Dimanche"],
] as const;

export const CRENEAUX = [
  ["matin", "Matin, avant 12h"],
  ["apres_midi", "Après-midi, de 12h à 18h"],
  ["soir", "Soir, à partir de 18h"],
] as const;

/**
 * Les barres d'une dimension, dans un ordre qui se lit : jours de lundi à dimanche, tranches dans
 * l'ordre de la journée, catégories de la plus proposée à la moins proposée. Un groupe sans
 * activité y figure quand même, à zéro : un jour vide est une information.
 */
export function barresDeRemplissage(
  lignes: LigneRemplissage[],
  dimension: DimensionRemplissage,
): Barre[] {
  const trouvees = new Map(
    lignes.filter((l) => l.dimension === dimension).map((l) => [l.cle, l]),
  );
  const groupes: (readonly [string, string])[] =
    dimension === "jour"
      ? JOURS_SEMAINE
      : dimension === "creneau"
        ? CRENEAUX
        : categoriesActiviteListe.map((cle) => [
            cle,
            categoriesActivite[cle].libelle,
          ]);

  const barres = groupes.map(([cle, libelle]) => ({
    cle,
    libelle,
    nombreActivites: trouvees.get(cle)?.nombre_activites ?? 0,
    taux: trouvees.get(cle)?.taux_remplissage ?? null,
  }));
  return dimension === "categorie"
    ? barres.toSorted((a, b) => b.nombreActivites - a.nombreActivites)
    : barres;
}

/** La barre au taux le plus haut (à égalité, la plus fournie en activités) ; `null` sans aucun taux. */
export function meilleureBarre(barres: Barre[]): Barre | null {
  let meilleure: Barre | null = null;
  for (const barre of barres) {
    if (barre.taux === null) continue;
    if (
      !meilleure ||
      barre.taux > meilleure.taux! ||
      (barre.taux === meilleure.taux &&
        barre.nombreActivites > meilleure.nombreActivites)
    )
      meilleure = barre;
  }
  return meilleure;
}
