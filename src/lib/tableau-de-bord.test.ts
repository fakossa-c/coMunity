import { describe, expect, it } from "vitest";
import {
  CRENEAUX,
  barresDeRemplissage,
  clePeriode,
  libelleMois,
  libelleNombreActivites,
  libelleNombreParticipants,
  libellePeriode,
  libelleTaux,
  meilleureBarre,
  partActivitesResidents,
  texteValeurBarre,
  periodeDe,
  resumeParMois,
  type LigneRemplissage,
} from "./tableau-de-bord";
import { aujourdhui } from "./partage-activite";

// Le 29 septembre 2026 est un mardi.
const AUJOURDHUI = "2026-09-29";

describe("periodeDe", () => {
  it("30 jours : le jour même et les 29 précédents", () => {
    expect(periodeDe("30_jours", AUJOURDHUI)).toEqual({
      debut: "2026-08-31",
      fin: "2026-09-29",
    });
  });

  it("3 mois : depuis le 1er du mois d'il y a deux mois, mois en cours compris", () => {
    expect(periodeDe("3_mois", AUJOURDHUI)).toEqual({
      debut: "2026-07-01",
      fin: "2026-09-29",
    });
  });

  it("12 mois : douze mois complets au plus, mois en cours compris", () => {
    expect(periodeDe("12_mois", AUJOURDHUI)).toEqual({
      debut: "2025-10-01",
      fin: "2026-09-29",
    });
  });

  it("3 mois en début d'année remonte sur l'année précédente", () => {
    expect(periodeDe("3_mois", "2026-01-05")).toEqual({
      debut: "2025-11-01",
      fin: "2026-01-05",
    });
  });

  it("année : depuis le 1er janvier", () => {
    expect(periodeDe("annee", AUJOURDHUI)).toEqual({
      debut: "2026-01-01",
      fin: "2026-09-29",
    });
  });
});

describe("periodeDe autour de minuit, à Paris", () => {
  // 22h30 UTC le 29 septembre 2026 : minuit et demi le 30 à Paris (UTC+2, heure d'été).
  const nuitEte = aujourdhui(new Date("2026-09-29T22:30:00Z"));
  // 23h30 UTC le 30 novembre 2026 : minuit et demi le 1er décembre à Paris (UTC+1, heure d'hiver).
  const nuitHiver = aujourdhui(new Date("2026-11-30T23:30:00Z"));

  it("la borne de fin est le jour de Paris, pas celui d'UTC", () => {
    expect(periodeDe("30_jours", nuitEte)).toEqual({
      debut: "2026-09-01",
      fin: "2026-09-30",
    });
  });

  it("le premier jour d'un mois après minuit, les périodes en mois commencent dans ce mois", () => {
    expect(periodeDe("3_mois", nuitHiver)).toEqual({
      debut: "2026-10-01",
      fin: "2026-12-01",
    });
    expect(periodeDe("12_mois", nuitHiver)).toEqual({
      debut: "2026-01-01",
      fin: "2026-12-01",
    });
  });

  it("le premier janvier après minuit, l'année est la nouvelle", () => {
    expect(
      periodeDe("annee", aujourdhui(new Date("2026-12-31T23:30:00Z"))),
    ).toEqual({ debut: "2027-01-01", fin: "2027-01-01" });
  });

  it("avant minuit à Paris, la période s'arrête encore ce jour-là", () => {
    // 21h30 UTC en été : 23h30 le 29 à Paris.
    expect(
      periodeDe("30_jours", aujourdhui(new Date("2026-09-29T21:30:00Z"))).fin,
    ).toBe("2026-09-29");
  });
});

describe("clePeriode", () => {
  it("reconnaît une période connue", () => {
    expect(clePeriode("12_mois")).toBe("12_mois");
  });

  it("retombe sur 3 mois pour une valeur absente ou inconnue", () => {
    expect(clePeriode(undefined)).toBe("3_mois");
    expect(clePeriode("toujours")).toBe("3_mois");
  });
});

describe("libellePeriode", () => {
  it("écrit les deux dates en toutes lettres", () => {
    expect(libellePeriode({ debut: "2026-07-01", fin: "2026-09-29" })).toBe(
      "Du 1er juillet 2026 au 29 septembre 2026",
    );
  });
});

describe("resumeParMois", () => {
  it("désigne le mois qui a le plus de participants distincts", () => {
    expect(
      resumeParMois([
        { mois: "2020-02-01", nombre_activites: 1, nombre_participants: 2 },
        { mois: "2020-03-01", nombre_activites: 4, nombre_participants: 4 },
        { mois: "2020-04-01", nombre_activites: 1, nombre_participants: 1 },
      ]),
    ).toBe("Le plus de participants distincts : mars 2020, 4 participants.");
  });

  it("à égalité, garde le mois le plus ancien", () => {
    expect(
      resumeParMois([
        { mois: "2020-02-01", nombre_activites: 1, nombre_participants: 3 },
        { mois: "2020-03-01", nombre_activites: 1, nombre_participants: 3 },
      ]),
    ).toBe("Le plus de participants distincts : février 2020, 3 participants.");
  });

  it("dit l'absence de participant quand tous les mois sont vides", () => {
    expect(
      resumeParMois([
        { mois: "2020-03-01", nombre_activites: 0, nombre_participants: 0 },
      ]),
    ).toBe("Aucun participant sur la période.");
  });
});

describe("créneaux", () => {
  it("écrit les heures comme le reste de l'app, avec les minutes", () => {
    expect(CRENEAUX.map(([, libelle]) => libelle)).toEqual([
      "Matin, avant 12h00",
      "Après-midi, de 12h00 à 18h00",
      "Soir, à partir de 18h00",
    ]);
  });
});

describe("libelleMois", () => {
  it("donne le mois et l'année", () => {
    expect(libelleMois("2020-03-01")).toBe("mars 2020");
  });

  it("donne le mois seul en version courte", () => {
    expect(libelleMois("2020-03-01", true)).toBe("mars");
  });
});

describe("libelleTaux", () => {
  it("écrit un pourcentage entier avec l'espace insécable", () => {
    expect(libelleTaux(65)).toBe("65 %");
  });

  it("garde une décimale utile, à la française", () => {
    expect(libelleTaux(33.3)).toBe("33,3 %");
  });

  it("dit l'absence de limite de places quand il n'y a pas de taux", () => {
    expect(libelleTaux(null)).toBe("Places non limitées");
  });
});

describe("partActivitesResidents", () => {
  it("donne la part des activités créées par des résidents, arrondie", () => {
    expect(
      partActivitesResidents({
        activites_par_residents: 3,
        activites_par_conseil: 1,
      }),
    ).toBe(75);
    expect(
      partActivitesResidents({
        activites_par_residents: 1,
        activites_par_conseil: 2,
      }),
    ).toBe(33);
  });

  it("est nulle de sens sans activité", () => {
    expect(
      partActivitesResidents({
        activites_par_residents: 0,
        activites_par_conseil: 0,
      }),
    ).toBeNull();
  });
});

const LIGNES: LigneRemplissage[] = [
  {
    dimension: "categorie",
    cle: "moments_partages",
    nombre_activites: 2,
    taux_remplissage: 65,
  },
  {
    dimension: "categorie",
    cle: "jardin_nature",
    nombre_activites: 1,
    taux_remplissage: 20,
  },
  { dimension: "jour", cle: "1", nombre_activites: 2, taux_remplissage: 30 },
  { dimension: "jour", cle: "6", nombre_activites: 2, taux_remplissage: 60 },
  {
    dimension: "creneau",
    cle: "soir",
    nombre_activites: 1,
    taux_remplissage: null,
  },
];

describe("barresDeRemplissage", () => {
  it("donne les sept jours de lundi à dimanche, ceux sans activité à zéro", () => {
    const jours = barresDeRemplissage(LIGNES, "jour");
    expect(jours.map((b) => b.libelle)).toEqual([
      "Lundi",
      "Mardi",
      "Mercredi",
      "Jeudi",
      "Vendredi",
      "Samedi",
      "Dimanche",
    ]);
    expect(jours[0]).toMatchObject({ nombreActivites: 2, taux: 30 });
    expect(jours[1]).toMatchObject({ nombreActivites: 0, taux: null });
    expect(jours[5]).toMatchObject({ nombreActivites: 2, taux: 60 });
  });

  it("donne les trois tranches horaires dans l'ordre de la journée", () => {
    const creneaux = barresDeRemplissage(LIGNES, "creneau");
    expect(creneaux.map((b) => b.cle)).toEqual(["matin", "apres_midi", "soir"]);
    expect(creneaux[2]).toMatchObject({ nombreActivites: 1, taux: null });
    expect(creneaux[0].nombreActivites).toBe(0);
  });

  it("donne les cinq catégories, celles qui ont le plus d'activités d'abord", () => {
    const categories = barresDeRemplissage(LIGNES, "categorie");
    expect(categories).toHaveLength(5);
    expect(categories.map((b) => b.cle).slice(0, 2)).toEqual([
      "moments_partages",
      "jardin_nature",
    ]);
    expect(categories[0].libelle).toBe("Moments partagés");
  });
});

describe("meilleureBarre", () => {
  it("désigne la barre au taux le plus haut", () => {
    const jours = barresDeRemplissage(LIGNES, "jour");
    expect(meilleureBarre(jours)?.libelle).toBe("Samedi");
  });

  it("est nulle quand aucune barre n'a de taux", () => {
    expect(meilleureBarre(barresDeRemplissage([], "jour"))).toBeNull();
  });

  it("à taux égal, garde celle qui a le plus d'activités", () => {
    const barres = barresDeRemplissage(
      [
        {
          dimension: "jour",
          cle: "2",
          nombre_activites: 1,
          taux_remplissage: 50,
        },
        {
          dimension: "jour",
          cle: "3",
          nombre_activites: 4,
          taux_remplissage: 50,
        },
      ],
      "jour",
    );
    expect(meilleureBarre(barres)?.libelle).toBe("Mercredi");
  });
});

describe("libelleNombreActivites", () => {
  it("accorde le nombre d'activités", () => {
    expect(libelleNombreActivites(0)).toBe("Aucune activité");
    expect(libelleNombreActivites(1)).toBe("1 activité");
    expect(libelleNombreActivites(4)).toBe("4 activités");
  });
});

describe("libelleNombreParticipants", () => {
  it("accorde le nombre de participants", () => {
    expect(libelleNombreParticipants(0)).toBe("Aucun participant");
    expect(libelleNombreParticipants(1)).toBe("1 participant");
    expect(libelleNombreParticipants(4)).toBe("4 participants");
  });
});

describe("texteValeurBarre", () => {
  it("donne le taux quand il existe", () => {
    expect(
      texteValeurBarre({
        cle: "1",
        libelle: "Lundi",
        nombreActivites: 2,
        taux: 30,
      }),
    ).toBe("30\u00a0%");
  });

  it("dit que les places ne sont pas limitées quand aucune activité n'a de capacité", () => {
    expect(
      texteValeurBarre({
        cle: "1",
        libelle: "Lundi",
        nombreActivites: 2,
        taux: null,
      }),
    ).toBe("Places non limitées");
  });

  it("dit l'absence d'activité", () => {
    expect(
      texteValeurBarre({
        cle: "1",
        libelle: "Lundi",
        nombreActivites: 0,
        taux: null,
      }),
    ).toBe("Aucune activité");
  });
});
