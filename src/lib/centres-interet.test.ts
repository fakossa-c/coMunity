import { describe, expect, it } from "vitest";
import {
  LONGUEUR_MAXIMALE_INTERET,
  refusInteret,
  type CentreInteret,
} from "./centres-interet";

const EXISTANTS: CentreInteret[] = [
  { id: "1", libelle: "Jardinage" },
  { id: "2", libelle: "Jeux de société" },
];

describe("refusInteret", () => {
  it("accepte un nouveau centre d'intérêt", () => {
    expect(refusInteret("Cuisine", EXISTANTS)).toBeNull();
  });

  it("refuse un libellé vide", () => {
    expect(refusInteret("   ", EXISTANTS)).toBe(
      "Saisissez un centre d'intérêt.",
    );
  });

  it("refuse un libellé trop long", () => {
    expect(refusInteret("x".repeat(LONGUEUR_MAXIMALE_INTERET + 1), [])).toBe(
      "Un centre d'intérêt tient en 40 caractères au plus.",
    );
  });

  it("refuse un centre d'intérêt déjà déclaré, à la casse et aux accents près", () => {
    expect(refusInteret(" jardinage ", EXISTANTS)).toBe(
      "Vous avez déjà déclaré ce centre d'intérêt.",
    );
  });

  it("laisse un centre d'intérêt garder son propre libellé quand on le modifie", () => {
    expect(refusInteret("JARDINAGE", EXISTANTS, "1")).toBeNull();
    expect(refusInteret("Jeux de société", EXISTANTS, "1")).toBe(
      "Vous avez déjà déclaré ce centre d'intérêt.",
    );
  });
});
