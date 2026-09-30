import { describe, expect, it } from "vitest";
import { classerMesActivites } from "./mes-activites";

const JOUR = "2026-10-20";

function activite(
  id: string,
  date_activite: string,
  extras: { heure_debut?: string; statut?: string } = {},
) {
  return { id, date_activite, heure_debut: "10:00:00", ...extras };
}

function classer(
  inscriptions: ReturnType<typeof activite>[],
  organisees: ReturnType<typeof activite>[] = [],
) {
  return classerMesActivites({ inscriptions, organisees, jour: JOUR });
}

describe("Je participe", () => {
  it("garde les inscriptions à venir, la plus proche d'abord, le jour même compris", () => {
    const { jeParticipe } = classer([
      activite("dans-huit-jours", "2026-10-28"),
      activite("aujourdhui-soir", JOUR, { heure_debut: "20:00:00" }),
      activite("aujourdhui-matin", JOUR, { heure_debut: "08:00:00" }),
      activite("hier", "2026-10-19"),
    ]);
    expect(jeParticipe.map((a) => a.id)).toEqual([
      "aujourdhui-matin",
      "aujourdhui-soir",
      "dans-huit-jours",
    ]);
  });

  it("garde une activité annulée par son créateur : on doit pouvoir le lire", () => {
    const { jeParticipe } = classer([
      activite("annulee", "2026-10-25", { statut: "annulee" }),
    ]);
    expect(jeParticipe.map((a) => a.id)).toEqual(["annulee"]);
  });
});

describe("J'organise", () => {
  it("garde les activités organisées à venir, la plus proche d'abord, annulées comprises", () => {
    const { jOrganise } = classer(
      [],
      [
        activite("tardive", "2026-11-02"),
        activite("annulee", "2026-10-22", { statut: "annulee" }),
        activite("passee", "2026-10-10"),
      ],
    );
    expect(jOrganise.map((a) => a.id)).toEqual(["annulee", "tardive"]);
  });

  it("garde une activité organisée où l'on est aussi inscrit dans les deux onglets", () => {
    const mienne = activite("mienne", "2026-10-25");
    const { jeParticipe, jOrganise } = classer([mienne], [mienne]);
    expect(jeParticipe.map((a) => a.id)).toEqual(["mienne"]);
    expect(jOrganise.map((a) => a.id)).toEqual(["mienne"]);
  });
});

describe("Archivées", () => {
  it("réunit toutes les activités passées, organisées ou suivies, la plus récente d'abord", () => {
    const { archivees } = classer(
      [
        activite("suivie-ancienne", "2026-09-13"),
        activite("suivie-recente", "2026-10-15"),
        activite("a-venir", "2026-10-25"),
      ],
      [
        activite("organisee-milieu", "2026-10-02"),
        activite("organisee-a-venir", "2026-10-30"),
      ],
    );
    expect(archivees.map((a) => a.activite.id)).toEqual([
      "suivie-recente",
      "organisee-milieu",
      "suivie-ancienne",
    ]);
  });

  it("marque chaque ligne de son rôle : organisée ou suivie", () => {
    const { archivees } = classer(
      [activite("suivie", "2026-10-15")],
      [activite("organisee", "2026-10-02")],
    );
    expect(archivees.map((a) => [a.activite.id, a.role])).toEqual([
      ["suivie", "suivie"],
      ["organisee", "organisee"],
    ]);
  });

  it("ne compte qu'une fois une activité organisée où l'on était aussi inscrit : le rôle d'organisateur l'emporte", () => {
    const mienne = activite("mienne", "2026-10-10");
    const { archivees } = classer([mienne], [mienne]);
    expect(archivees).toEqual([{ activite: mienne, role: "organisee" }]);
  });

  it("écarte une activité suivie que son créateur a annulée : on n'y est pas allé", () => {
    const { archivees } = classer([
      activite("annulee", "2026-10-15", { statut: "annulee" }),
      activite("tenue", "2026-10-14"),
    ]);
    expect(archivees.map((a) => a.activite.id)).toEqual(["tenue"]);
  });

  it("garde une activité organisée puis annulée : son organisateur la retrouve", () => {
    const { archivees } = classer(
      [],
      [activite("annulee", "2026-10-15", { statut: "annulee" })],
    );
    expect(archivees.map((a) => a.activite.id)).toEqual(["annulee"]);
  });

  it("n'est pas une activité du jour même : elle reste à venir", () => {
    const { archivees, jeParticipe } = classer([activite("ce-soir", JOUR)]);
    expect(archivees).toEqual([]);
    expect(jeParticipe.map((a) => a.id)).toEqual(["ce-soir"]);
  });
});

describe("les compteurs", () => {
  it("se lisent dans la longueur de chaque liste", () => {
    const resultat = classer(
      [
        activite("s1", "2026-10-25"),
        activite("s2", "2026-10-26"),
        activite("s3", "2026-10-01"),
      ],
      [activite("o1", "2026-10-27"), activite("o2", "2026-10-02")],
    );
    expect(resultat.jeParticipe).toHaveLength(2);
    expect(resultat.jOrganise).toHaveLength(1);
    expect(resultat.archivees).toHaveLength(2);
  });
});
