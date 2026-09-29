import { describe, expect, it } from "vitest";
import {
  analyserProposition,
  type EntreeJev,
  type MoteurJev,
  type Proposition,
  type ReglesResidence,
  type ReponseJev,
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

/** Une réponse de Jev sans avis : à compléter par ce que chaque test veut lui faire dire. */
const SANS_AVIS: ReponseJev = {
  categorie: null,
  pictogramme: null,
  informationsManquantes: [],
  conformite: null,
};

/** Un faux Jev qui répond `reponse`, et garde ce qu'on lui a envoyé. */
function fauxJev(reponse: Partial<ReponseJev>) {
  const recus: EntreeJev[] = [];
  const moteur: MoteurJev = async (entree) => {
    recus.push(entree);
    return { ...SANS_AVIS, ...reponse };
  };
  return { moteur, recus };
}

describe("assistant de création avec Jev", () => {
  describe("catégorie et pictogramme", () => {
    it("suggère la catégorie et le pictogramme quand Jev est sûr de lui", async () => {
      const { moteur } = fauxJev({
        categorie: { valeur: "culture_loisirs", confiance: 0.9 },
        pictogramme: { valeur: "menu_book", confiance: 0.85 },
      });

      const avis = await analyserProposition(proposition, regles, {
        jev: moteur,
      });

      expect(avis.categorieSuggeree).toBe("culture_loisirs");
      expect(avis.pictogrammeSuggere).toBe("menu_book");
    });

    it("suggère à partir de 0,6 de confiance, pas en dessous", async () => {
      const limite = fauxJev({
        categorie: { valeur: "culture_loisirs", confiance: 0.6 },
        pictogramme: { valeur: "menu_book", confiance: 0.6 },
      });
      const dessous = fauxJev({
        categorie: { valeur: "culture_loisirs", confiance: 0.59 },
        pictogramme: { valeur: "menu_book", confiance: 0.59 },
      });

      const pile = await analyserProposition(proposition, regles, {
        jev: limite.moteur,
      });
      const incertain = await analyserProposition(proposition, regles, {
        jev: dessous.moteur,
      });

      expect(pile.categorieSuggeree).toBe("culture_loisirs");
      expect(pile.pictogrammeSuggere).toBe("menu_book");
      expect(incertain.categorieSuggeree).toBeNull();
      expect(incertain.pictogrammeSuggere).toBeNull();
    });

    it("écarte une catégorie ou un pictogramme qui n'existe pas", async () => {
      const { moteur } = fauxJev({
        categorie: { valeur: "sport_extreme", confiance: 0.99 },
        pictogramme: { valeur: "fusee", confiance: 0.99 },
      });

      const avis = await analyserProposition(proposition, regles, {
        jev: moteur,
      });

      expect(avis.categorieSuggeree).toBeNull();
      expect(avis.pictogrammeSuggere).toBeNull();
    });
  });

  describe("informations qui semblent manquer", () => {
    it("les signale comme des conseils qui ne bloquent pas, après les règles", async () => {
      const { moteur } = fauxJev({
        informationsManquantes: [
          "Que faut-il apporter ?",
          "  ",
          "Le niveau requis n'est pas précisé.",
        ],
      });

      const avis = await analyserProposition(
        { ...proposition, heureFin: "23:00" },
        regles,
        { jev: moteur },
      );

      expect(avis.avertissements.map((a) => a.regle)).toEqual([
        "heure_fin_max",
        "heure_calme",
        "information_manquante",
        "information_manquante",
      ]);
      expect(avis.avertissements.slice(2)).toEqual([
        {
          regle: "information_manquante",
          bloquant: false,
          message: "Que faut-il apporter ?",
        },
        {
          regle: "information_manquante",
          bloquant: false,
          message: "Le niveau requis n'est pas précisé.",
        },
      ]);
    });

    it("n'en garde que trois", async () => {
      const { moteur } = fauxJev({
        informationsManquantes: ["a ?", "b ?", "c ?", "d ?", "e ?"],
      });

      const avis = await analyserProposition(proposition, regles, {
        jev: moteur,
      });

      expect(avis.avertissements.map((a) => a.message)).toEqual([
        "a ?",
        "b ?",
        "c ?",
      ]);
    });
  });

  describe("pré-modération", () => {
    it("met en relecture, avec la raison, une proposition non conforme à 0,8 de confiance", async () => {
      const { moteur } = fauxJev({
        conformite: {
          conforme: false,
          raison: "Une soirée bruyante jusqu'à l'aube.",
          confiance: 0.8,
        },
      });

      const avis = await analyserProposition(proposition, regles, {
        jev: moteur,
      });

      expect(avis.moderation).toEqual({
        avis: "a_relire",
        raison: "Une soirée bruyante jusqu'à l'aube.",
      });
    });

    it("ne met pas en relecture sous 0,8 de confiance", async () => {
      const { moteur } = fauxJev({
        conformite: {
          conforme: false,
          raison: "Peut-être du bruit.",
          confiance: 0.79,
        },
      });

      const avis = await analyserProposition(proposition, regles, {
        jev: moteur,
      });

      expect(avis.moderation).toEqual({ avis: "pas_d_avis" });
    });

    it("donne une raison même quand Jev n'en donne pas", async () => {
      const { moteur } = fauxJev({
        conformite: { conforme: false, raison: " ", confiance: 0.95 },
      });

      const avis = await analyserProposition(proposition, regles, {
        jev: moteur,
      });

      expect(avis.moderation).toEqual({
        avis: "a_relire",
        raison:
          "Jev juge cette proposition contraire aux règles de bon voisinage.",
      });
    });

    it("dit conforme quand Jev en est sûr, pas d'avis sinon", async () => {
      const sur = fauxJev({
        conformite: { conforme: true, raison: "", confiance: 0.9 },
      });
      const hesitant = fauxJev({
        conformite: { conforme: true, raison: "", confiance: 0.5 },
      });

      const conforme = await analyserProposition(proposition, regles, {
        jev: sur.moteur,
      });
      const incertain = await analyserProposition(proposition, regles, {
        jev: hesitant.moteur,
      });

      expect(conforme.moderation).toEqual({ avis: "conforme" });
      expect(incertain.moderation).toEqual({ avis: "pas_d_avis" });
    });
  });

  describe("ce qui part vers Jev", () => {
    it("ne contient que le titre, la description et le créneau", async () => {
      const { moteur, recus } = fauxJev({});

      await analyserProposition(
        {
          ...proposition,
          lieu: { type: "libre", libelle: "Chez Danielle, 2e étage" },
          capaciteMax: 4,
        },
        regles,
        { jev: moteur },
      );

      expect(recus).toEqual([
        {
          titre: "Goûter crêpes",
          description: "On apporte des crêpes et on joue aux cartes.",
          date: "2026-10-24",
          heureDebut: "16:00",
          heureFin: "18:00",
        },
      ]);
    });
  });

  describe("Jev en erreur ou trop lent", () => {
    it("sur erreur, ne suggère rien, ne donne pas d'avis et garde les règles", async () => {
      const enPanne: MoteurJev = async () => {
        throw new Error("503");
      };

      const avis = await analyserProposition(
        { ...proposition, heureFin: "21:30" },
        regles,
        { jev: enPanne },
      );

      expect(avis).toEqual({
        categorieSuggeree: null,
        pictogrammeSuggere: null,
        avertissements: [
          expect.objectContaining({ regle: "heure_fin_max", bloquant: true }),
        ],
        moderation: { avis: "pas_d_avis" },
      });
    });

    it("sur réponse illisible, se comporte comme sur erreur", async () => {
      const illisible = (async () => ({ n_importe: "quoi" })) as never;

      const avis = await analyserProposition(proposition, regles, {
        jev: illisible,
      });

      expect(avis).toEqual({
        categorieSuggeree: null,
        pictogrammeSuggere: null,
        avertissements: [],
        moderation: { avis: "pas_d_avis" },
      });
    });

    it("au-delà du délai, n'attend plus et coupe l'appel", async () => {
      let coupe = false;
      const lent: MoteurJev = (_entree, signal) =>
        new Promise((_resoudre, rejeter) => {
          signal.addEventListener("abort", () => {
            coupe = true;
            rejeter(new Error("coupé"));
          });
        });

      const avis = await analyserProposition(proposition, regles, {
        jev: lent,
        delaiJevMs: 20,
      });

      expect(avis.moderation).toEqual({ avis: "pas_d_avis" });
      expect(avis.categorieSuggeree).toBeNull();
      expect(coupe).toBe(true);
    });

    it("au-delà du délai, n'attend pas non plus un Jev qui ignore la coupure", async () => {
      const sourd: MoteurJev = () => new Promise(() => {});

      const avis = await analyserProposition(proposition, regles, {
        jev: sourd,
        delaiJevMs: 20,
      });

      expect(avis.moderation).toEqual({ avis: "pas_d_avis" });
    });
  });

  it("sans Jev, l'assistant ne suggère rien et ne donne aucun avis", async () => {
    const avis = await analyserProposition(proposition, regles, {});

    expect(avis).toEqual({
      categorieSuggeree: null,
      pictogrammeSuggere: null,
      avertissements: [],
      moderation: { avis: "pas_d_avis" },
    });
  });
});
