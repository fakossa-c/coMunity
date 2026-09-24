import { describe, expect, it } from "vitest";
import { identite } from "./identite";

describe("identite", () => {
  it("prend l'initiale du prénom et le nom complet", () => {
    expect(
      identite({ prenom: "danielle", nom: "Martin", email: "d@exemple.fr" }),
    ).toEqual({ initiale: "D", nom: "danielle Martin" });
  });

  it("garde l'initiale d'un prénom accentué", () => {
    expect(
      identite({ prenom: "Élise", nom: "Roy", email: "e@exemple.fr" }).initiale,
    ).toBe("É");
  });

  it("se rabat sur l'email d'un compte sans prénom, comme un membre du syndic amorcé", () => {
    expect(
      identite({ prenom: null, nom: null, email: "gestion@syndic.fr" }),
    ).toEqual({ initiale: "G", nom: "gestion@syndic.fr" });
  });
});
