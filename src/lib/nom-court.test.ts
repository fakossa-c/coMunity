import { describe, expect, it } from "vitest";
import { nomCourt } from "./nom-court";

describe("nom court de la résidence, affiché sous l'icône de l'app", () => {
  it("retire le mot « Résidence » placé en tête", () => {
    expect(nomCourt("Résidence Les Tilleuls")).toBe("Les Tilleuls");
    expect(nomCourt("résidence du Parc")).toBe("du Parc");
  });

  it("garde un nom qui ne commence pas par « Résidence »", () => {
    expect(nomCourt("Les Jardins d'Arcadie")).toBe("Les Jardins d'Arcadie");
    expect(nomCourt("Résidences Unies")).toBe("Résidences Unies");
  });

  it("garde le nom entier quand il ne reste rien après « Résidence »", () => {
    expect(nomCourt("Résidence")).toBe("Résidence");
    expect(nomCourt("  Résidence  ")).toBe("Résidence");
  });
});
