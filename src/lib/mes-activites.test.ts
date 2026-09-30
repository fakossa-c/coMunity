import { describe, expect, it } from "vitest";
import { classerMesActivites } from "./mes-activites";

const JOUR = "2026-10-20";
// Midi à Paris (heure d'été) ce jour-là.
const MAINTENANT = new Date("2026-10-20T10:00:00Z");

function activite(
  id: string,
  date_activite: string,
  extras: { heure_debut?: string; heure_fin?: string; statut?: string } = {},
) {
  return {
    id,
    date_activite,
    heure_debut: "10:00:00",
    heure_fin: "11:00:00",
    ...extras,
  };
}

function classer(
  inscriptions: ReturnType<typeof activite>[],
  organisees: ReturnType<typeof activite>[] = [],
) {
  return classerMesActivites({
    inscriptions,
    organisees,
    maintenant: MAINTENANT,
  });
}

describe("Je participe", () => {
  it("garde les inscriptions à venir, la plus proche d'abord, le jour même compris tant qu'elles ne sont pas finies", () => {
    const { jeParticipe } = classer([
      activite("dans-huit-jours", "2026-10-28"),
      activite("aujourdhui-soir", JOUR, {
        heure_debut: "20:00:00",
        heure_fin: "21:00:00",
      }),
      activite("aujourdhui-en-cours", JOUR, {
        heure_debut: "11:00:00",
        heure_fin: "13:00:00",
      }),
      activite("hier", "2026-10-19"),
    ]);
    expect(jeParticipe.map((a) => a.id)).toEqual([
      "aujourdhui-en-cours",
      "aujourdhui-soir",
      "dans-huit-jours",
    ]);
  });

  it("laisse partir de « Je participe » l'activité du jour à son heure de fin", () => {
    const { jeParticipe } = classer([activite("ce-matin", JOUR)]);
    expect(jeParticipe).toEqual([]);
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

  it("accueille l'activité du jour terminée, et pas celle qui reste à venir ce soir", () => {
    const { archivees, jeParticipe } = classer([
      activite("ce-matin", JOUR),
      activite("ce-soir", JOUR, {
        heure_debut: "20:00:00",
        heure_fin: "21:00:00",
      }),
    ]);
    expect(archivees.map((a) => a.activite.id)).toEqual(["ce-matin"]);
    expect(jeParticipe.map((a) => a.id)).toEqual(["ce-soir"]);
  });

  it("y range l'activité du jour terminée que l'on organise, et la retire de « J'organise »", () => {
    const { archivees, jOrganise } = classer([], [activite("ce-matin", JOUR)]);
    expect(jOrganise).toEqual([]);
    expect(archivees.map((a) => [a.activite.id, a.role])).toEqual([
      ["ce-matin", "organisee"],
    ]);
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
