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

  it("refuse sans npm test vert enregistré", () => {
    expect(verdict({ ...pret, marqueur: null })).toMatch(/npm test/);
  });

  it("refuse un npm test vert qui ne porte pas sur le commit de tête", () => {
    expect(verdict({ ...pret, commitTete: "def4567890" })).toMatch(
      /npm test.*commit/s,
    );
  });

  it("refuse un npm test vert lancé sur un arbre non commité", () => {
    expect(
      verdict({ ...pret, marqueur: { commit: "abc123", arbreSale: true } }),
    ).toMatch(/npm test.*non commit/s);
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
    expect(raison).toMatch(/npm test/);
  });
});
