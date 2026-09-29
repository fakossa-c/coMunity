import { describe, expect, it } from "vitest";
import {
  SAISIE_SONDAGE_VIDE,
  affichageSondage,
  estOuvert,
  libelleEcheance,
  libelleReponses,
  pourcentages,
  saisieSondageCopie,
  verifierSondage,
  versLigneSondage,
  type SaisieSondage,
} from "./sondages";

const JOUR = "2026-10-20";

const SAISIE: SaisieSondage = {
  question: "  Quel créneau vous convient le mieux ?  ",
  options: ["7h à 21h", " 6h à 23h ", "", "Accès 24h/24"],
  echeance: "2026-10-30",
};

describe("vérification de la saisie d'un sondage", () => {
  it("une saisie complète passe", () => {
    expect(verifierSondage(SAISIE, JOUR)).toEqual({});
  });

  it("la question est obligatoire", () => {
    expect(verifierSondage({ ...SAISIE, question: "   " }, JOUR)).toEqual({
      champ: "question",
      erreur: "Posez une question aux résidents.",
    });
  });

  it("la question tient en 200 caractères", () => {
    expect(
      verifierSondage({ ...SAISIE, question: "a".repeat(201) }, JOUR),
    ).toEqual({ champ: "question", erreur: "200 caractères maximum." });
  });

  it("il faut au moins deux options : les lignes vides ne comptent pas", () => {
    expect(
      verifierSondage({ ...SAISIE, options: ["Une seule", "", "  "] }, JOUR),
    ).toEqual({
      champ: "options",
      erreur: "Proposez au moins deux options.",
    });
  });

  it("six options au plus, chacune de 100 caractères au plus", () => {
    expect(
      verifierSondage(
        { ...SAISIE, options: ["a", "b", "c", "d", "e", "f", "g"] },
        JOUR,
      ),
    ).toEqual({ champ: "options", erreur: "Six options au maximum." });
    expect(
      verifierSondage({ ...SAISIE, options: ["a", "b".repeat(101)] }, JOUR),
    ).toEqual({
      champ: "options",
      erreur: "100 caractères maximum par option.",
    });
  });

  it("deux options identiques, à la casse et aux espaces près, sont refusées", () => {
    expect(
      verifierSondage({ ...SAISIE, options: ["Oui", " oui "] }, JOUR),
    ).toEqual({
      champ: "options",
      erreur: "Deux options sont identiques.",
    });
  });

  it("la date limite est obligatoire, et aujourd'hui compris", () => {
    expect(verifierSondage({ ...SAISIE, echeance: "" }, JOUR)).toEqual({
      champ: "echeance",
      erreur: "Choisissez la date limite des réponses.",
    });
    expect(verifierSondage({ ...SAISIE, echeance: JOUR }, JOUR)).toEqual({});
    expect(
      verifierSondage({ ...SAISIE, echeance: "2026-10-19" }, JOUR),
    ).toEqual({
      champ: "echeance",
      erreur: "Cette date est déjà passée : personne ne pourrait répondre.",
    });
  });
});

describe("ce que la base enregistre", () => {
  it("la question et les options sont nettoyées, les lignes vides retirées", () => {
    expect(versLigneSondage(SAISIE)).toEqual({
      question: "Quel créneau vous convient le mieux ?",
      options: ["7h à 21h", "6h à 23h", "Accès 24h/24"],
      echeance: "2026-10-30",
    });
  });

  it("une copie garde la question et les options, mais pas la date limite", () => {
    expect(
      saisieSondageCopie({
        question: "Quel créneau ?",
        options: ["A", "B"],
        echeance: "2026-10-30",
      }),
    ).toEqual({
      question: "Quel créneau ?",
      options: ["A", "B"],
      echeance: "",
    });
  });

  it("la saisie vide propose deux lignes d'option", () => {
    expect(SAISIE_SONDAGE_VIDE.options).toEqual(["", ""]);
  });
});

describe("pourcentages", () => {
  it("arrondit et retombe sur 100 : la plus grande part restante l'emporte", () => {
    expect(pourcentages([1, 1, 1])).toEqual([34, 33, 33]);
    expect(pourcentages([9, 11, 3])).toEqual([39, 48, 13]);
    expect(pourcentages([2, 1])).toEqual([67, 33]);
  });

  it("sans aucune réponse, chaque option est à 0", () => {
    expect(pourcentages([0, 0, 0])).toEqual([0, 0, 0]);
  });

  it("une option unanime vaut 100", () => {
    expect(pourcentages([0, 5, 0])).toEqual([0, 100, 0]);
  });
});

describe("échéance et nombre de réponses", () => {
  it("le sondage est ouvert jusqu'à sa date limite comprise", () => {
    expect(estOuvert("2026-10-20", "2026-10-20")).toBe(true);
    expect(estOuvert("2026-10-20", "2026-10-21")).toBe(false);
  });

  it("la date limite se dit en jour et mois", () => {
    expect(libelleEcheance("2026-10-30")).toBe("30 octobre");
  });

  it("le nombre de réponses s'accorde", () => {
    expect(libelleReponses(0)).toBe("Aucune réponse");
    expect(libelleReponses(1)).toBe("1 réponse");
    expect(libelleReponses(23)).toBe("23 réponses");
  });
});

describe("ce que la personne voit d'un sondage", () => {
  const SONDAGE = {
    id: "s1",
    question: "Quel créneau ?",
    options: ["A", "B", "C"],
    echeance: "2026-10-30",
  };

  it("un résident validé qui n'a pas répondu, avant la date limite : il vote, sans résultat", () => {
    expect(
      affichageSondage({
        sondage: SONDAGE,
        choix: null,
        votes: null,
        peutRepondre: true,
        jour: JOUR,
      }),
    ).toEqual({ etat: "vote" });
  });

  it("un résident en attente, avant la date limite : il lit, sans voter ni résultat", () => {
    expect(
      affichageSondage({
        sondage: SONDAGE,
        choix: null,
        votes: null,
        peutRepondre: false,
        jour: JOUR,
      }),
    ).toEqual({ etat: "lecture" });
  });

  it("après sa réponse, les résultats avec son choix", () => {
    expect(
      affichageSondage({
        sondage: SONDAGE,
        choix: 2,
        votes: [1, 2, 1],
        peutRepondre: true,
        jour: JOUR,
      }),
    ).toEqual({
      etat: "resultats",
      votes: [1, 2, 1],
      pourcentages: [25, 50, 25],
      reponses: 4,
      choix: 2,
      clos: false,
    });
  });

  it("après la date limite, les résultats pour tous, sans possibilité de répondre", () => {
    expect(
      affichageSondage({
        sondage: SONDAGE,
        choix: null,
        votes: [0, 3, 0],
        peutRepondre: true,
        jour: "2026-10-31",
      }),
    ).toEqual({
      etat: "resultats",
      votes: [0, 3, 0],
      pourcentages: [0, 100, 0],
      reponses: 3,
      choix: null,
      clos: true,
    });
  });

  it("le conseil syndical qui n'a pas répondu lit les résultats avant la date limite", () => {
    expect(
      affichageSondage({
        sondage: SONDAGE,
        choix: null,
        votes: [0, 0, 0],
        peutRepondre: true,
        jour: JOUR,
      }),
    ).toMatchObject({ etat: "resultats", clos: false, reponses: 0 });
  });
});
