import { describe, expect, it } from "vitest";
import {
  SAISIE_ESPACE_VIDE,
  decouperConsignes,
  emplacementEspace,
  lienFicheEspace,
  lienProposerIci,
  libelleCapacite,
  libelleDimensions,
  libelleHauteur,
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
  longueur: "",
  largeur: "",
  hauteur_plafond: "",
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
  photos: [],
  longueur_m: null,
  largeur_m: null,
  hauteur_plafond_m: null,
  plan_chemin: null,
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
      longueur_m: null,
      largeur_m: null,
      hauteur_plafond_m: null,
    });
    expect(
      versEspaceCommun({ ...SAISIE_ESPACE_VIDE, nom: "Cour" }),
    ).toMatchObject({ capacite: null, heure_fin_max: null, equipements: [] });
  });

  it("les dimensions et la hauteur sont facultatives, saisies avec une virgule ou un point", () => {
    expect(verifierEspace(SAISIE)).toEqual({});
    expect(
      verifierEspace({
        ...SAISIE,
        longueur: "8",
        largeur: "6,5",
        hauteur_plafond: "2.70",
      }),
    ).toEqual({});
    expect(
      versEspaceCommun({
        ...SAISIE,
        longueur: " 8 ",
        largeur: "6,5",
        hauteur_plafond: "2.70",
      }),
    ).toMatchObject({ longueur_m: 8, largeur_m: 6.5, hauteur_plafond_m: 2.7 });
  });

  it("la longueur et la largeur vont ensemble : l'une sans l'autre est refusée", () => {
    expect(verifierEspace({ ...SAISIE, longueur: "8" })).toEqual({
      champ: "largeur",
      erreur: "Indiquez aussi la largeur, ou videz la longueur.",
    });
    expect(verifierEspace({ ...SAISIE, largeur: "6" })).toEqual({
      champ: "longueur",
      erreur: "Indiquez aussi la longueur, ou videz la largeur.",
    });
  });

  it("refuse une dimension hors de 0,5 à 100 m et une hauteur hors de 1 à 15 m", () => {
    const dimensions = { longueur: "8", largeur: "6" };
    for (const [champ, valeur, erreur] of [
      ["longueur", "0,4", "Indiquez une longueur de 0,5 à 100 m."],
      ["longueur", "101", "Indiquez une longueur de 0,5 à 100 m."],
      ["largeur", "0", "Indiquez une largeur de 0,5 à 100 m."],
      ["largeur", "abc", "Indiquez une largeur de 0,5 à 100 m."],
      ["hauteur_plafond", "0,9", "Indiquez une hauteur de 1 à 15 m."],
      ["hauteur_plafond", "15,5", "Indiquez une hauteur de 1 à 15 m."],
      ["hauteur_plafond", "-2", "Indiquez une hauteur de 1 à 15 m."],
    ] as const)
      expect(
        verifierEspace({ ...SAISIE, ...dimensions, [champ]: valeur }),
        `${champ} ${valeur}`,
      ).toEqual({ champ, erreur });
    // Les bornes elles-mêmes passent.
    expect(
      verifierEspace({
        ...SAISIE,
        longueur: "0,5",
        largeur: "100",
        hauteur_plafond: "15",
      }),
    ).toEqual({});
  });

  it("modifier reprend l'espace tel quel, heures sans les secondes", () => {
    expect(saisieDepuisEspace(ESPACE)).toEqual({
      ...SAISIE,
      nom: "Salle commune",
    });
  });

  it("modifier reprend les mesures avec une virgule décimale", () => {
    expect(
      saisieDepuisEspace({
        ...ESPACE,
        longueur_m: 8,
        largeur_m: 6.5,
        hauteur_plafond_m: 2.7,
      }),
    ).toMatchObject({ longueur: "8", largeur: "6,5", hauteur_plafond: "2,7" });
  });
});

describe("affichage", () => {
  it("dit les dimensions avec leur surface, ou rien sans les deux", () => {
    expect(libelleDimensions(8, 6)).toBe("8 m × 6 m, soit 48 m²");
    expect(libelleDimensions(7.5, 4.2)).toBe("7,5 m × 4,2 m, soit 31,5 m²");
    expect(libelleDimensions(5.55, 3)).toBe("5,55 m × 3 m, soit 16,7 m²");
    expect(libelleDimensions(null, 6)).toBeNull();
    expect(libelleDimensions(8, null)).toBeNull();
  });

  it("dit la hauteur sous plafond en mètres, ou rien", () => {
    expect(libelleHauteur(2.7)).toBe("2,7 m");
    expect(libelleHauteur(3)).toBe("3 m");
    expect(libelleHauteur(null)).toBeNull();
  });

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

describe("emplacementEspace", () => {
  it("joint bâtiment et localisation, sans rien inventer quand l'un manque", () => {
    expect(
      emplacementEspace({ batiment: "Bâtiment A", localisation: "Sous-sol" }),
    ).toBe("Bâtiment A · Sous-sol");
    expect(
      emplacementEspace({ batiment: null, localisation: "Sous-sol" }),
    ).toBe("Sous-sol");
    expect(emplacementEspace({ batiment: null, localisation: null })).toBe("");
  });
});
