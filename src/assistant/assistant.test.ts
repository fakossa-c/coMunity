import { describe, expect, it } from "vitest";
import {
  analyserProposition,
  type Proposition,
  type ReglesResidence,
} from "@/assistant";

const SALLE = "salle-commune";

const proposition: Proposition = {
  titre: "Goûter crêpes",
  description: "On apporte des crêpes et on joue aux cartes.",
  categorie: null,
  date: "2026-10-24",
  heureDebut: "16:00",
  heureFin: "18:00",
  lieu: { type: "espace_commun", idEspace: SALLE },
  capaciteMax: 12,
};

const regles: ReglesResidence = {
  heureCalme: "22:00:00",
  espacesCommuns: [
    { id: SALLE, nom: "Salle commune", capacite: 20, heureFinMax: "21:00:00" },
    { id: "cour", nom: "Cour intérieure", capacite: null, heureFinMax: null },
  ],
  occupations: [],
};

/** Les avertissements que l'assistant donne pour `modifications` apportées à la proposition. */
async function avertissements(
  modifications: Partial<Proposition>,
  contexte: ReglesResidence = regles,
) {
  const avis = await analyserProposition(
    { ...proposition, ...modifications },
    contexte,
  );
  return avis.avertissements;
}

describe("assistant de création", () => {
  it("sans règle enfreinte, ne donne aucun avertissement ni suggestion", async () => {
    const avis = await analyserProposition(proposition, regles);

    expect(avis).toEqual({
      categorieSuggeree: null,
      pictogrammeSuggere: null,
      avertissements: [],
      moderation: { avis: "pas_d_avis" },
    });
  });

  it("sans règles de la résidence, ne donne aucun avis", async () => {
    const avis = await analyserProposition(proposition);

    expect(avis.avertissements).toEqual([]);
  });

  describe("heure de fin maximale de l'espace commun", () => {
    it("bloque un créneau qui finit après, en donnant l'heure limite", async () => {
      expect(await avertissements({ heureFin: "21:30" })).toEqual([
        {
          regle: "heure_fin_max",
          bloquant: true,
          message:
            "L'espace commun « Salle commune » ferme à 21h00 : finissez au plus tard à 21h00.",
        },
      ]);
    });

    it("laisse passer un créneau qui finit pile à l'heure limite", async () => {
      expect(await avertissements({ heureFin: "21:00" })).toEqual([]);
    });

    it("ne s'applique pas à un espace sans heure limite", async () => {
      expect(
        await avertissements({
          lieu: { type: "espace_commun", idEspace: "cour" },
          heureFin: "21:30",
        }),
      ).toEqual([]);
    });
  });

  describe("capacité de l'espace commun", () => {
    it("bloque plus de places que l'espace n'en accueille", async () => {
      expect(await avertissements({ capaciteMax: 25 })).toEqual([
        {
          regle: "capacite_espace",
          bloquant: true,
          message:
            "L'espace commun « Salle commune » accueille 20 personnes au plus : limitez les places à 20.",
        },
      ]);
    });

    it("bloque une activité sans limite de places dans un espace limité", async () => {
      expect(await avertissements({ capaciteMax: null })).toEqual([
        expect.objectContaining({ regle: "capacite_espace", bloquant: true }),
      ]);
    });

    it("laisse passer autant de places que l'espace en accueille", async () => {
      expect(await avertissements({ capaciteMax: 20 })).toEqual([]);
    });

    it("ne s'applique pas à un espace sans capacité", async () => {
      expect(
        await avertissements({
          lieu: { type: "espace_commun", idEspace: "cour" },
          capaciteMax: null,
        }),
      ).toEqual([]);
    });
  });

  describe("heure de calme de la résidence", () => {
    it("avertit, sans bloquer, d'une fin après l'heure de calme", async () => {
      expect(
        await avertissements({
          lieu: { type: "libre", libelle: "Chez Danielle, 2e étage" },
          heureFin: "22:30",
        }),
      ).toEqual([
        {
          regle: "heure_calme",
          bloquant: false,
          message:
            "Votre activité finit après 22h00, l'heure de calme de la résidence : pensez aux voisins.",
        },
      ]);
    });

    it("ne dit rien d'une fin pile à l'heure de calme", async () => {
      expect(
        await avertissements({
          lieu: { type: "libre", libelle: "Chez Danielle" },
          heureFin: "22:00",
        }),
      ).toEqual([]);
    });

    it("s'ajoute au blocage de l'heure limite de l'espace", async () => {
      const regles = await avertissements({ heureFin: "22:30" });

      expect(regles.map((a) => a.regle)).toEqual([
        "heure_fin_max",
        "heure_calme",
      ]);
    });
  });

  describe("chevauchement avec une activité publiée", () => {
    const occupee: ReglesResidence = {
      ...regles,
      occupations: [
        {
          titre: "Atelier tricot",
          idEspace: SALLE,
          date: "2026-10-24",
          heureDebut: "17:30:00",
          heureFin: "19:00:00",
        },
      ],
    };

    it("avertit, sans bloquer, qu'une autre activité occupe l'espace sur ce créneau", async () => {
      expect(await avertissements({}, occupee)).toEqual([
        {
          regle: "chevauchement",
          bloquant: false,
          message:
            "« Atelier tricot » occupe déjà l'espace commun « Salle commune » ce jour-là, de 17h30 à 19h00.",
        },
      ]);
    });

    it("ne dit rien de créneaux qui se suivent", async () => {
      expect(
        await avertissements(
          { heureDebut: "19:00", heureFin: "20:00" },
          occupee,
        ),
      ).toEqual([]);
    });

    it("ne dit rien d'une autre date ni d'un autre espace", async () => {
      expect(await avertissements({ date: "2026-10-25" }, occupee)).toEqual([]);
      expect(
        await avertissements(
          { lieu: { type: "espace_commun", idEspace: "cour" } },
          occupee,
        ),
      ).toEqual([]);
    });
  });

  describe("lieu libre (« Autre »)", () => {
    it("n'applique aucune règle d'espace commun, seulement l'heure de calme", async () => {
      const occupee: ReglesResidence = {
        ...regles,
        occupations: [
          {
            titre: "Atelier tricot",
            idEspace: SALLE,
            date: "2026-10-24",
            heureDebut: "16:00",
            heureFin: "23:00",
          },
        ],
      };

      const regle = await avertissements(
        {
          lieu: { type: "libre", libelle: "Salle commune" },
          heureFin: "23:00",
          capaciteMax: null,
        },
        occupee,
      );

      expect(regle.map((a) => a.regle)).toEqual(["heure_calme"]);
    });
  });
});
