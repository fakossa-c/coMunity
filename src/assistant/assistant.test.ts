import { describe, expect, it } from "vitest";
import { analyserProposition, type Proposition } from "@/assistant";

const proposition: Proposition = {
  titre: "Goûter crêpes au jardin",
  description: "On apporte des crêpes et on joue aux cartes.",
  categorie: null,
  date: "2026-10-24",
  heureDebut: "16:00",
  heureFin: "18:00",
  lieu: { type: "libre", libelle: "Jardin partagé" },
  capaciteMax: 12,
};

describe("assistant de création", () => {
  it("ne donne encore aucun avis : ni suggestion, ni avertissement", async () => {
    const avis = await analyserProposition(proposition);

    expect(avis).toEqual({
      categorieSuggeree: null,
      pictogrammeSuggere: null,
      avertissements: [],
      moderation: { avis: "pas_d_avis" },
    });
  });
});
