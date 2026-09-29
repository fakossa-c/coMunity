import { describe, expect, it } from "vitest";
import { identite } from "./identite";

describe("identite", () => {
  it("prend l'initiale du pseudo et le pseudo", () => {
    expect(
      identite({
        pseudo: "dany",
        prenom: "Danielle",
        email: "d@exemple.fr",
      }),
    ).toEqual({ initiale: "D", nom: "dany" });
  });

  it("garde l'initiale d'un prénom accentué", () => {
    expect(
      identite({
        pseudo: null,
        prenom: "Élise",
        email: "e@exemple.fr",
      }).initiale,
    ).toBe("É");
  });

  it("se rabat sur l'email d'un compte sans prénom, comme un membre du syndic amorcé", () => {
    expect(
      identite({
        pseudo: null,
        prenom: null,
        email: "gestion@syndic.fr",
      }),
    ).toEqual({ initiale: "G", nom: "gestion@syndic.fr" });
  });
});
