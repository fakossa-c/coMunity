import { describe, expect, it } from "vitest";
import { refusIdentite } from "./nom-complet";

describe("refusIdentite", () => {
  it("accepte un prénom et un nom", () => {
    expect(refusIdentite({ prenom: "Colette", nom: "Durand" })).toBeNull();
  });

  it.each([
    [{ prenom: "", nom: "Durand" }, "prenom", "Saisissez votre prénom."],
    [{ prenom: "Colette", nom: "" }, "nom", "Saisissez votre nom."],
    [
      { prenom: "Colette", nom: "x".repeat(41) },
      "nom",
      "Votre nom tient en 40 caractères au plus.",
    ],
    [
      { prenom: "x".repeat(41), nom: "Durand" },
      "prenom",
      "Votre prénom tient en 40 caractères au plus.",
    ],
  ])("refuse %o sous le champ %s", (identite, champ, erreur) => {
    expect(refusIdentite(identite)).toEqual({ champ, erreur });
  });
});
