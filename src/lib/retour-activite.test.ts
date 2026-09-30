import { describe, expect, it } from "vitest";
import { libelleNombreRetours, libelleNoteMoyenne } from "./retour-activite";

describe("libelleNoteMoyenne", () => {
  it("affiche la moyenne sur 5", () => {
    expect(libelleNoteMoyenne(3.5)).toBe("3,5 / 5");
  });

  it("affiche une moyenne entière sans décimale superflue", () => {
    expect(libelleNoteMoyenne(4)).toBe("4 / 5");
  });

  it("indique l'absence de retour", () => {
    expect(libelleNoteMoyenne(null)).toBe("Aucun avis pour l'instant");
  });
});

describe("libelleNombreRetours", () => {
  it("accorde au singulier", () => {
    expect(libelleNombreRetours(1)).toBe("1 avis");
  });

  it("accorde au pluriel", () => {
    expect(libelleNombreRetours(3)).toBe("3 avis");
  });

  it("indique l'absence de retour", () => {
    expect(libelleNombreRetours(0)).toBe("Aucun avis");
  });
});
