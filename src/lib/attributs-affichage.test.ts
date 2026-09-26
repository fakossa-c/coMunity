import { describe, expect, it } from "vitest";
import { attributsAffichage } from "./attributs-affichage";

describe("attributsAffichage", () => {
  it("ne pose aucun attribut pour un visiteur non connecté", () => {
    expect(attributsAffichage(null)).toEqual({});
  });

  it("ne pose aucun attribut à la taille et au thème par défaut", () => {
    expect(attributsAffichage({ taille: "standard", theme: "clair" })).toEqual(
      {},
    );
  });

  it("pose data-taille=grands pour les grands caractères", () => {
    expect(attributsAffichage({ taille: "grands", theme: "clair" })).toEqual({
      "data-taille": "grands",
    });
  });

  it("pose data-theme=sombre pour le thème sombre", () => {
    expect(attributsAffichage({ taille: "standard", theme: "sombre" })).toEqual(
      { "data-theme": "sombre" },
    );
  });

  it("pose les deux attributs quand les deux réglages sont actifs", () => {
    expect(attributsAffichage({ taille: "grands", theme: "sombre" })).toEqual({
      "data-taille": "grands",
      "data-theme": "sombre",
    });
  });
});
