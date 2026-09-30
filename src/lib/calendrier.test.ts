import { describe, expect, it } from "vitest";
import {
  debutDeSemaine,
  finDeSemaine,
  jourDecale,
  libelleJour,
  libelleMois,
  moisDe,
  moisDecale,
  semainesDuMois,
} from "./calendrier";

describe("mois affiché", () => {
  it("le mois d'une date s'écrit AAAA-MM", () => {
    expect(moisDe("2026-10-24")).toBe("2026-10");
  });

  it("passe au mois précédent et au suivant, à cheval sur deux années", () => {
    expect(moisDecale("2026-10", 1)).toBe("2026-11");
    expect(moisDecale("2026-12", 1)).toBe("2027-01");
    expect(moisDecale("2027-01", -1)).toBe("2026-12");
  });

  it("s'écrit en français avec une majuscule", () => {
    expect(libelleMois("2026-10")).toBe("Octobre 2026");
    expect(libelleMois("2027-02")).toBe("Février 2027");
  });
});

describe("grille du mois", () => {
  it("commence le lundi : octobre 2026 débute un jeudi, trois cases vides avant le 1er", () => {
    const semaines = semainesDuMois("2026-10");
    expect(semaines[0]).toEqual([
      null,
      null,
      null,
      "2026-10-01",
      "2026-10-02",
      "2026-10-03",
      "2026-10-04",
    ]);
  });

  it("compte tous les jours du mois, semaines complétées de cases vides", () => {
    const semaines = semainesDuMois("2026-10");
    expect(semaines.every((semaine) => semaine.length === 7)).toBe(true);
    expect(semaines.flat().filter(Boolean)).toHaveLength(31);
    expect(semaines.at(-1)).toEqual([
      "2026-10-26",
      "2026-10-27",
      "2026-10-28",
      "2026-10-29",
      "2026-10-30",
      "2026-10-31",
      null,
    ]);
  });

  it("un mois qui commence un lundi n'a aucune case vide au début", () => {
    expect(semainesDuMois("2026-06")[0][0]).toBe("2026-06-01");
  });

  it("février d'une année bissextile a 29 jours", () => {
    expect(semainesDuMois("2028-02").flat().filter(Boolean)).toHaveLength(29);
  });
});

describe("déplacement au clavier", () => {
  it("décale d'un jour ou d'une semaine, d'un mois sur l'autre", () => {
    expect(jourDecale("2026-10-31", 1)).toBe("2026-11-01");
    expect(jourDecale("2026-11-01", -1)).toBe("2026-10-31");
    expect(jourDecale("2026-12-30", 7)).toBe("2027-01-06");
  });

  it("Début et Fin mènent au lundi et au dimanche de la semaine", () => {
    // Le samedi 24 octobre 2026.
    expect(debutDeSemaine("2026-10-24")).toBe("2026-10-19");
    expect(finDeSemaine("2026-10-24")).toBe("2026-10-25");
    // Le lundi et le dimanche restent en place.
    expect(debutDeSemaine("2026-10-19")).toBe("2026-10-19");
    expect(finDeSemaine("2026-10-25")).toBe("2026-10-25");
  });
});

describe("annonce d'un jour", () => {
  it("dit le jour de la semaine, le quantième, le mois et l'année", () => {
    expect(libelleJour("2026-10-24")).toBe("samedi 24 octobre 2026");
    expect(libelleJour("2026-12-01")).toBe("mardi 1 décembre 2026");
  });
});
