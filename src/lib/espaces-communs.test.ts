import { describe, expect, it } from "vitest";
import {
  SAISIE_ESPACE_VIDE,
  decouperConsignes,
  lienFicheEspace,
  lienProposerIci,
  libelleCapacite,
  reglesResidence,
  resumeEspace,
  saisieDepuisEspace,
  verifierEspace,
  versEspaceCommun,
  type EspaceCommun,
  type SaisieEspace,
} from "./espaces-communs";

const SAISIE: SaisieEspace = {
  nom: "  Salle commune ",
  batiment: "Bâtiment B",
  localisation: "Rez-de-chaussée",
  description: "",
  capacite: "20",
  equipements: ["acces_plain_pied", "cuisine"],
  heure_fin_max: "21:00",
  consignes: "Laissez la salle propre.",
  horaires_acces: "",
  contact: "Colette, gardienne",
};

/** Un espace commun tel que la base le livre : heures avec secondes, champs absents à `null`. */
const ESPACE: EspaceCommun = {
  id: "salle",
  nom: "Salle commune",
  batiment: "Bâtiment B",
  localisation: "Rez-de-chaussée",
  description: null,
  capacite: 20,
  equipements: ["acces_plain_pied", "cuisine"],
  heure_fin_max: "21:00:00",
  consignes: "Laissez la salle propre.",
  horaires_acces: null,
  contact: "Colette, gardienne",
  photo_chemin: null,
};

describe("saisie d'un espace commun", () => {
  it("une saisie complète passe", () => {
    expect(verifierEspace(SAISIE)).toEqual({});
  });

  it("le nom est obligatoire", () => {
    expect(verifierEspace({ ...SAISIE, nom: "  " })).toEqual({
      champ: "nom",
      erreur: "Donnez un nom à l'espace commun.",
    });
  });

  it("le nom tient en 60 caractères, les consignes en 500", () => {
    expect(verifierEspace({ ...SAISIE, nom: "x".repeat(61) })).toMatchObject({
      champ: "nom",
    });
    expect(
      verifierEspace({ ...SAISIE, consignes: "x".repeat(501) }),
    ).toMatchObject({ champ: "consignes" });
  });

  it("la capacité est facultative, mais d'au moins 1 personne", () => {
    expect(verifierEspace({ ...SAISIE, capacite: "" })).toEqual({});
    expect(verifierEspace({ ...SAISIE, capacite: "0" })).toEqual({
      champ: "capacite",
      erreur: "Indiquez une capacité d'au moins 1 personne, ou laissez vide.",
    });
  });

  it("devient la ligne à enregistrer : texte nettoyé, champs vides à null", () => {
    expect(versEspaceCommun(SAISIE)).toEqual({
      nom: "Salle commune",
      batiment: "Bâtiment B",
      localisation: "Rez-de-chaussée",
      description: null,
      capacite: 20,
      equipements: ["acces_plain_pied", "cuisine"],
      heure_fin_max: "21:00",
      consignes: "Laissez la salle propre.",
      horaires_acces: null,
      contact: "Colette, gardienne",
    });
    expect(
      versEspaceCommun({ ...SAISIE_ESPACE_VIDE, nom: "Cour" }),
    ).toMatchObject({ capacite: null, heure_fin_max: null, equipements: [] });
  });

  it("modifier reprend l'espace tel quel, heures sans les secondes", () => {
    expect(saisieDepuisEspace(ESPACE)).toEqual({
      ...SAISIE,
      nom: "Salle commune",
    });
  });
});

describe("affichage", () => {
  it("dit la capacité d'un espace, ou son absence", () => {
    expect(libelleCapacite(20)).toBe("Jusqu'à 20 personnes");
    expect(libelleCapacite(1)).toBe("Jusqu'à 1 personne");
    expect(libelleCapacite(null)).toBe("Sans limite de places");
  });

  it("résume un espace en une ligne : bâtiment, capacité, heure limite", () => {
    expect(resumeEspace(ESPACE)).toBe(
      "Bâtiment B · Jusqu'à 20 personnes · Ferme à 21h00",
    );
    expect(
      resumeEspace({ batiment: null, capacite: null, heure_fin_max: null }),
    ).toBe("Sans limite de places");
  });
});

describe("règles transmises à l'assistant", () => {
  it("reprend l'heure de calme, les espaces et les activités qui les occupent", () => {
    expect(
      reglesResidence({
        heureCalme: "22:00:00",
        espaces: [ESPACE],
        occupations: [
          {
            titre: "Atelier tricot",
            espace_commun_id: "salle",
            date_activite: "2026-10-24",
            heure_debut: "17:00:00",
            heure_fin: "19:00:00",
          },
        ],
      }),
    ).toEqual({
      heureCalme: "22:00:00",
      espacesCommuns: [
        {
          id: "salle",
          nom: "Salle commune",
          capacite: 20,
          heureFinMax: "21:00:00",
        },
      ],
      occupations: [
        {
          titre: "Atelier tricot",
          idEspace: "salle",
          date: "2026-10-24",
          heureDebut: "17:00:00",
          heureFin: "19:00:00",
        },
      ],
    });
  });
});

describe("lienFicheEspace", () => {
  it("mène à la fiche de l'espace, sous Ma copro", () => {
    expect(lienFicheEspace("a1b2")).toBe("/ma-copro/espaces/a1b2");
  });
});

describe("lienProposerIci", () => {
  it("ouvre Proposer avec l'espace en paramètre `espace`", () => {
    expect(lienProposerIci("a1b2")).toBe("/proposer?espace=a1b2");
  });
});

describe("decouperConsignes", () => {
  it("ne donne rien sans consigne", () => {
    expect(decouperConsignes(null)).toEqual({ visibles: [], suite: [] });
    expect(decouperConsignes("  \n \n")).toEqual({ visibles: [], suite: [] });
  });

  it("garde deux consignes visibles et replie les suivantes, une par ligne non vide", () => {
    const consignes =
      "Rangez les chaises.\n\n  Éteignez la cuisine. \nLa musique s'arrête à 22h.\nSignalez toute casse.";

    expect(decouperConsignes(consignes)).toEqual({
      visibles: ["Rangez les chaises.", "Éteignez la cuisine."],
      suite: ["La musique s'arrête à 22h.", "Signalez toute casse."],
    });
  });

  it("ne replie rien quand il y en a deux ou moins", () => {
    expect(decouperConsignes("Une seule.")).toEqual({
      visibles: ["Une seule."],
      suite: [],
    });
    expect(decouperConsignes("Une.\nDeux.")).toEqual({
      visibles: ["Une.", "Deux."],
      suite: [],
    });
  });
});
