import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { jourParis } from "./paris";

// 30/09/2026 à 22h15 UTC : 1er octobre, 0h15 à Paris (heure d'été).
const MINUIT_A_PARIS = new Date("2026-09-30T22:15:00Z");

describe("jourParis", () => {
  it("donne le jour de Paris, pas celui d'UTC, entre minuit et 2h à Paris", () => {
    expect(jourParis(0, MINUIT_A_PARIS)).toBe("2026-10-01");
  });

  it("décale d'autant de jours civils, dans le futur comme dans le passé", () => {
    expect(jourParis(30, MINUIT_A_PARIS)).toBe("2026-10-31");
    expect(jourParis(-2, MINUIT_A_PARIS)).toBe("2026-09-29");
  });

  it("compte des jours civils à travers le passage à l'heure d'hiver (25 octobre 2026)", () => {
    // 25/10 à 0h30 à Paris : 24 h plus tard, il est encore le 25 (le jour dure 25 h).
    expect(jourParis(1, new Date("2026-10-24T22:30:00Z"))).toBe("2026-10-26");
  });
});

// Les fichiers déjà passés au jour de Paris (ticket #202). Un fichier s'ajoute ici quand il est corrigé.
const FICHIERS_AU_JOUR_DE_PARIS = [
  "demo-comptes.test.ts",
  "suppression-compte.test.ts",
];

describe("tests base : les jours viennent de paris.ts", () => {
  it.each(FICHIERS_AU_JOUR_DE_PARIS)(
    "%s ne calcule aucun jour sur toISOString() (le jour d'UTC retarde de 1 jour entre minuit et 2h à Paris)",
    (nom) => {
      const source = readFileSync(new URL(nom, import.meta.url), "utf8");
      expect(source).not.toMatch(/toISOString\(\)\s*\.slice\(0,\s*10\)/);
    },
  );
});
