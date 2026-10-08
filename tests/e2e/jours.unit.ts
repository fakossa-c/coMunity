import { describe, expect, it } from "vitest";
import { jourDeParis } from "./jours";

// 30/09/2026 à 22h15 UTC : 1er octobre, 0h15 à Paris (heure d'été).
const MINUIT_A_PARIS = new Date("2026-09-30T22:15:00Z");

describe("jourDeParis", () => {
  it("donne le jour de Paris, pas celui d'UTC, entre minuit et 2h à Paris", () => {
    expect(jourDeParis(0, MINUIT_A_PARIS)).toBe("2026-10-01");
  });

  it("décale d'autant de jours, dans le futur comme dans le passé, d'un mois sur l'autre", () => {
    expect(jourDeParis(30, MINUIT_A_PARIS)).toBe("2026-10-31");
    expect(jourDeParis(-1, MINUIT_A_PARIS)).toBe("2026-09-30");
    expect(jourDeParis(-2, MINUIT_A_PARIS)).toBe("2026-09-29");
  });

  it("suit l'heure d'hiver : 23h15 UTC le 30/11 est déjà le 1er décembre à Paris", () => {
    expect(jourDeParis(0, new Date("2026-11-30T23:15:00Z"))).toBe("2026-12-01");
    expect(jourDeParis(0, new Date("2026-11-30T22:15:00Z"))).toBe("2026-11-30");
  });

  it("vaut le jour de Paris en plein après-midi", () => {
    expect(jourDeParis(0, new Date("2026-10-08T12:00:00Z"))).toBe("2026-10-08");
  });
});
