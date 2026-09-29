import { describe, expect, it } from "vitest";
import { CONFIRMATIONS, estDecision } from "./decision-moderation";

describe("décisions de modération", () => {
  it("annonce chaque décision par une phrase accordée avec l'activité", () => {
    expect(CONFIRMATIONS.publier("Goûter")).toBe("« Goûter » est publiée.");
    expect(CONFIRMATIONS.refuser("Goûter")).toBe("« Goûter » est refusée.");
    expect(CONFIRMATIONS.masquer("Goûter")).toBe("« Goûter » est masquée.");
    expect(CONFIRMATIONS.retablir("Goûter")).toBe("« Goûter » est rétablie.");
  });

  it("ne reconnaît que les quatre décisions, jamais un nom hérité de l'objet", () => {
    for (const decision of ["publier", "refuser", "masquer", "retablir"]) {
      expect(estDecision(decision)).toBe(true);
    }
    for (const autre of [
      undefined,
      "",
      "supprimer",
      "toString",
      "constructor",
    ]) {
      expect(estDecision(autre)).toBe(false);
    }
  });
});
