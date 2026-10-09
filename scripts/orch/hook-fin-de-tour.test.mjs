import { describe, expect, it } from "vitest";
import { verdict } from "./hook-fin-de-tour.mjs";

const marqueurVert = { commit: "abc123", arbreSale: false };

// Une session de ticket dans l'état où elle peut rendre la main : PR ouverte, arbre propre, branche
// de ticket, npm test vert sur le commit de tête.
const pret = {
  ticket: 215,
  hookDejaBloque: false,
  labels: [],
  branche: "ticket-215",
  arbreSale: false,
  pr: true,
  commitTete: "abc123",
  marqueur: marqueurVert,
  parties: null,
};

describe("verdict de fin de tour", () => {
  it("laisse tout passer hors d'un worktree de ticket", () => {
    expect(
      verdict({
        ...pret,
        ticket: null,
        branche: "develop",
        arbreSale: true,
        pr: false,
        marqueur: null,
      }),
    ).toBeNull();
  });

  it("laisse passer une session prête : PR ouverte, arbre propre, test vert sur la tête", () => {
    expect(verdict(pret)).toBeNull();
  });

  it("laisse passer quand le hook a déjà bloqué ce tour, même si tout manque", () => {
    expect(
      verdict({
        ...pret,
        hookDejaBloque: true,
        pr: false,
        arbreSale: true,
        marqueur: null,
      }),
    ).toBeNull();
  });

  it("laisse passer un ticket qui porte needs-info (question posée)", () => {
    expect(
      verdict({ ...pret, labels: ["needs-info"], pr: false, marqueur: null }),
    ).toBeNull();
  });

  it("laisse passer un ticket qui porte ready-for-human (blocage déclaré)", () => {
    expect(
      verdict({
        ...pret,
        labels: ["ready-for-agent", "ready-for-human"],
        pr: false,
        arbreSale: true,
        marqueur: null,
      }),
    ).toBeNull();
  });

  it("refuse sans PR ni label, en disant ce qui manque", () => {
    const raison = verdict({ ...pret, pr: false });
    expect(raison).toMatch(/PR/);
    expect(raison).toMatch(/needs-info/);
    expect(raison).toMatch(/ready-for-human/);
  });

  it("refuse quand GitHub est illisible plutôt que de supposer une PR", () => {
    expect(verdict({ ...pret, pr: null, labels: null })).toMatch(/GitHub/);
  });

  it("refuse un arbre git sale", () => {
    expect(verdict({ ...pret, arbreSale: true })).toMatch(/non commit/);
  });

  it("refuse la branche develop", () => {
    expect(verdict({ ...pret, branche: "develop" })).toMatch(/develop/);
  });

  it("refuse sans test vert enregistré et nomme la commande de chaque partie", () => {
    const raison = verdict({ ...pret, marqueur: null });
    for (const nom of ["format", "unitaires", "base", "mobile", "ordinateur"]) {
      expect(raison).toContain(`npm run test:partie -- ${nom}`);
    }
  });

  it("ne nomme que les parties qui manquent sur le commit de tête", () => {
    const raison = verdict({
      ...pret,
      marqueur: null,
      parties: {
        commit: "abc123",
        parties: { format: "t", unitaires: "t", base: "t" },
      },
    });
    expect(raison).toContain("npm run test:partie -- mobile");
    expect(raison).toContain("npm run test:partie -- ordinateur");
    expect(raison).not.toContain("test:partie -- format");
    expect(raison).not.toContain("test:partie -- base");
  });

  it("repart des cinq parties quand les vertes datent d'un autre commit", () => {
    const raison = verdict({
      ...pret,
      marqueur: null,
      parties: {
        commit: "ancien1",
        parties: { format: "t", unitaires: "t", base: "t" },
      },
    });
    expect(raison).toContain("npm run test:partie -- format");
  });

  it("refuse un marqueur qui ne porte pas sur le commit de tête", () => {
    const raison = verdict({ ...pret, commitTete: "def4567890" });
    expect(raison).toMatch(/commit def4567/);
    expect(raison).toContain("npm run test:partie -- format");
  });

  it("refuse un test vert lancé sur un arbre non commité", () => {
    expect(
      verdict({ ...pret, marqueur: { commit: "abc123", arbreSale: true } }),
    ).toMatch(/non commit/);
  });

  it("énumère d'un coup tout ce qui manque", () => {
    const raison = verdict({
      ...pret,
      pr: false,
      arbreSale: true,
      marqueur: null,
    });
    expect(raison).toMatch(/PR/);
    expect(raison).toMatch(/non commit/);
    expect(raison).toContain("npm run test:partie -- base");
  });
});
