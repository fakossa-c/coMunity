import { describe, expect, it } from "vitest";
import {
  activitesDeLaSemaine,
  categorieFiltree,
  grouperParJour,
  resumeSemaine,
} from "./accueil";

type A = {
  id: string;
  date_activite: string;
  heure_debut: string;
  statut?: "publiee" | "annulee" | "en_relecture" | "masquee";
};

function activite(
  id: string,
  date_activite: string,
  heure_debut = "10:00:00",
  statut: A["statut"] = "publiee",
): A {
  return { id, date_activite, heure_debut, statut };
}

// Le samedi 24 octobre 2026.
const AUJOURDHUI = "2026-10-24";

describe("activités groupées par jour", () => {
  it("regroupe les activités d'un même jour, dans l'ordre chronologique", () => {
    const jours = grouperParJour(
      [
        activite("c", "2026-10-27", "18:00:00"),
        activite("b", "2026-10-24", "16:00:00"),
        activite("a", "2026-10-24", "09:30:00"),
      ],
      AUJOURDHUI,
    );

    expect(jours.map((j) => j.date)).toEqual(["2026-10-24", "2026-10-27"]);
    expect(jours[0].activites.map((a) => a.id)).toEqual(["a", "b"]);
    expect(jours[1].activites.map((a) => a.id)).toEqual(["c"]);
  });

  it("le jour même s'intitule « Aujourd’hui », les autres par leur date", () => {
    const jours = grouperParJour(
      [activite("a", "2026-10-24"), activite("b", "2026-10-27")],
      AUJOURDHUI,
    );

    expect(jours[0]).toMatchObject({ titre: "Aujourd’hui", aujourdhui: true });
    expect(jours[1]).toMatchObject({
      titre: "Mardi 27 octobre",
      aujourdhui: false,
    });
  });

  it("sans activité, aucun jour", () => {
    expect(grouperParJour([], AUJOURDHUI)).toEqual([]);
  });
});

describe("activités de la semaine", () => {
  it("compte d'aujourd'hui à dimanche inclus", () => {
    const activites = [
      activite("samedi", "2026-10-24"),
      activite("dimanche", "2026-10-25", "20:00:00"),
      activite("lundi", "2026-10-26"),
    ];

    expect(activitesDeLaSemaine(activites, AUJOURDHUI)).toBe(2);
  });

  it("un lundi, compte jusqu'au dimanche suivant", () => {
    const activites = [
      activite("lundi", "2026-10-26"),
      activite("dimanche", "2026-11-01"),
      activite("lundi suivant", "2026-11-02"),
    ];

    expect(activitesDeLaSemaine(activites, "2026-10-26")).toBe(2);
  });

  it("un dimanche, ne compte que le jour même", () => {
    const activites = [
      activite("dimanche", "2026-10-25"),
      activite("lundi", "2026-10-26"),
    ];

    expect(activitesDeLaSemaine(activites, "2026-10-25")).toBe(1);
  });

  it("ne compte pas une activité annulée", () => {
    const activites = [
      activite("a", "2026-10-24"),
      activite("b", "2026-10-25", "10:00:00", "annulee"),
    ];

    expect(activitesDeLaSemaine(activites, AUJOURDHUI)).toBe(1);
  });

  it("ne compte pas une activité en relecture ou masquée, que son créateur voit encore", () => {
    const activites = [
      activite("a", "2026-10-24"),
      activite("b", "2026-10-25", "10:00:00", "en_relecture"),
      activite("c", "2026-10-25", "11:00:00", "masquee"),
    ];

    expect(activitesDeLaSemaine(activites, AUJOURDHUI)).toBe(1);
  });

  it("se résume en une phrase accordée", () => {
    expect(resumeSemaine(0)).toBe("Aucune activité prévue cette semaine");
    expect(resumeSemaine(1)).toBe("1 activité prévue cette semaine");
    expect(resumeSemaine(4)).toBe("4 activités prévues cette semaine");
  });
});

describe("filtre par catégorie", () => {
  it("reconnaît une catégorie de la liste", () => {
    expect(categorieFiltree("jardin_nature")).toBe("jardin_nature");
  });

  it("revient à « Toutes » pour une valeur absente ou inconnue", () => {
    expect(categorieFiltree(undefined)).toBeNull();
    expect(categorieFiltree("inconnue")).toBeNull();
    expect(categorieFiltree("toString")).toBeNull();
  });
});
