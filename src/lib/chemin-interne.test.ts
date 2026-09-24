import { describe, expect, it } from "vitest";
import { cheminInterne } from "./chemin-interne";

describe("chemin de retour après connexion", () => {
  it("garde un chemin de l'application, requête comprise", () => {
    expect(cheminInterne("/syndic/membres")).toBe("/syndic/membres");
    expect(cheminInterne("/activites/abc?onglet=photos")).toBe(
      "/activites/abc?onglet=photos",
    );
  });

  it.each([
    ["une adresse externe", "https://pirate.example/"],
    ["une adresse sans protocole", "//pirate.example/"],
    ["une barre oblique inversée", "/\\pirate.example/"],
    ["un chemin relatif", "syndic"],
    ["une valeur vide", ""],
    ["une valeur absente", null],
  ])("refuse %s", (_, valeur) => {
    expect(cheminInterne(valeur)).toBeNull();
  });
});
