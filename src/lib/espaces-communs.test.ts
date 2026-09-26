import { describe, expect, it } from "vitest";
import {
  SAISIE_ESPACE_VIDE,
  libelleCapacite,
  reglesResidence,
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
