import { describe, expect, it } from "vitest";
import { activiteALaUne } from "./a-la-une";

type Statut = "publiee" | "annulee" | "en_relecture" | "masquee";

function activite(
  id: string,
  date_activite: string,
  extras: {
    heure_debut?: string;
    statut?: Statut;
    capacite_max?: number | null;
    places_prises?: number;
    mes_accompagnants?: number | null;
  } = {},
) {
  return { id, date_activite, heure_debut: "10:00:00", ...extras };
}

describe("l'activité « À la une »", () => {
  it("est la première activité à venir, jour puis heure de début", () => {
    const activites = [
      activite("lundi-soir", "2026-10-26", { heure_debut: "20:00:00" }),
      activite("lundi-matin", "2026-10-26", { heure_debut: "09:00:00" }),
      activite("samedi", "2026-10-24"),
    ];
    expect(activiteALaUne(activites)?.id).toBe("samedi");
    expect(activiteALaUne(activites.slice(0, 2))?.id).toBe("lundi-matin");
  });

  it("ignore une activité annulée et prend la suivante", () => {
    const activites = [
      activite("annulee", "2026-10-24", { statut: "annulee" }),
      activite("suivante", "2026-10-25"),
    ];
    expect(activiteALaUne(activites)?.id).toBe("suivante");
  });

  it("ignore une activité masquée ou en relecture", () => {
    const activites = [
      activite("masquee", "2026-10-24", { statut: "masquee" }),
      activite("relecture", "2026-10-24", { statut: "en_relecture" }),
      activite("suivante", "2026-10-25"),
    ];
    expect(activiteALaUne(activites)?.id).toBe("suivante");
  });

  it("ignore une activité complète, mais pas une activité sans limite de places", () => {
    const activites = [
      activite("complete", "2026-10-24", {
        capacite_max: 8,
        places_prises: 8,
      }),
      activite("sans-limite", "2026-10-25", {
        capacite_max: null,
        places_prises: 40,
      }),
    ];
    expect(activiteALaUne(activites)?.id).toBe("sans-limite");
  });

  it("garde une activité où il reste une place", () => {
    const activites = [
      activite("presque", "2026-10-24", { capacite_max: 8, places_prises: 7 }),
    ];
    expect(activiteALaUne(activites)?.id).toBe("presque");
  });

  it("garde une activité où le résident est déjà inscrit", () => {
    const activites = [
      activite("inscrit", "2026-10-24", { mes_accompagnants: 0 }),
      activite("suivante", "2026-10-25"),
    ];
    expect(activiteALaUne(activites)?.id).toBe("inscrit");
  });

  it("ignore une activité annulée même si le résident y est inscrit", () => {
    const activites = [
      activite("annulee", "2026-10-24", {
        statut: "annulee",
        mes_accompagnants: 1,
      }),
    ];
    expect(activiteALaUne(activites)).toBeNull();
  });

  it("n'en désigne aucune quand aucune activité n'est éligible", () => {
    expect(activiteALaUne([])).toBeNull();
    expect(
      activiteALaUne([
        activite("annulee", "2026-10-24", { statut: "annulee" }),
        activite("masquee", "2026-10-25", { statut: "masquee" }),
        activite("complete", "2026-10-26", {
          capacite_max: 4,
          places_prises: 4,
        }),
      ]),
    ).toBeNull();
  });

  it("ne modifie pas la liste reçue", () => {
    const activites = [
      activite("b", "2026-10-25"),
      activite("a", "2026-10-24"),
    ];
    activiteALaUne(activites);
    expect(activites.map((a) => a.id)).toEqual(["b", "a"]);
  });
});
