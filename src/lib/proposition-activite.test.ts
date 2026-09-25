import { describe, expect, it } from "vitest";
import {
  LIMITES,
  SAISIE_VIDE,
  verifierEtape,
  versNouvelleActivite,
  type SaisieActivite,
} from "./proposition-activite";

const COMPLETE: SaisieActivite = {
  ...SAISIE_VIDE,
  titre: "Goûter crêpes",
  categorie: "moments_partages",
  mot_accueil: "Venez comme vous êtes.",
  date_activite: "2026-10-24",
  heure_debut: "16:00",
  heure_fin: "18:30",
  lieu: "Jardin partagé",
  precision_acces: "Portail vert",
  places: "limitees",
  capacite_max: "12",
  capacite_min: "4",
  etiquettes: ["acces_plain_pied", "enfants_bienvenus"],
  conseils_pratiques: "Une petite laine.",
  materiel_prevoir: "Poêles fournies.",
  a_apporter: "Une garniture.",
};

describe("limites de saisie", () => {
  it("titre 50, précision d'accès 120, mot d'accueil 300", () => {
    expect(LIMITES).toEqual({ titre: 50, precision_acces: 120, mot_accueil: 300 });
  });
});

describe("vérification d'une étape", () => {
  it("une saisie complète passe les trois étapes", () => {
    expect(verifierEtape(1, COMPLETE)).toEqual({});
    expect(verifierEtape(2, COMPLETE)).toEqual({});
    expect(verifierEtape(3, COMPLETE)).toEqual({});
  });

  it("étape 1 : le titre est obligatoire", () => {
    expect(verifierEtape(1, { ...COMPLETE, titre: "   " })).toMatchObject({
      champ: "titre",
    });
  });

  it("étape 1 : le titre tient en 50 caractères", () => {
    expect(
      verifierEtape(1, { ...COMPLETE, titre: "x".repeat(51) }),
    ).toMatchObject({ champ: "titre" });
  });

  it("étape 1 : le mot d'accueil tient en 300 caractères", () => {
    expect(
      verifierEtape(1, { ...COMPLETE, mot_accueil: "x".repeat(301) }),
    ).toMatchObject({ champ: "mot_accueil" });
  });

  it("étape 2 : date, heures et lieu sont obligatoires", () => {
    expect(verifierEtape(2, { ...COMPLETE, date_activite: "" })).toMatchObject({
      champ: "date_activite",
    });
    expect(verifierEtape(2, { ...COMPLETE, heure_debut: "" })).toMatchObject({
      champ: "heure_debut",
    });
    expect(verifierEtape(2, { ...COMPLETE, lieu: " " })).toMatchObject({
      champ: "lieu",
    });
  });

  it("étape 2 : l'heure de fin suit l'heure de début", () => {
    expect(
      verifierEtape(2, { ...COMPLETE, heure_debut: "18:00", heure_fin: "16:00" }),
    ).toMatchObject({
      champ: "heure_fin",
      erreur: "L'heure de fin doit être après l'heure de début.",
    });
  });

  it("étape 2 : la précision d'accès tient en 120 caractères", () => {
    expect(
      verifierEtape(2, { ...COMPLETE, precision_acces: "x".repeat(121) }),
    ).toMatchObject({ champ: "precision_acces" });
  });

  it("étape 3 : des places limitées demandent un nombre", () => {
    expect(verifierEtape(3, { ...COMPLETE, capacite_max: "" })).toMatchObject({
      champ: "capacite_max",
    });
    expect(verifierEtape(3, { ...COMPLETE, capacite_max: "0" })).toMatchObject({
      champ: "capacite_max",
    });
  });

  it("étape 3 : le minimum ne dépasse pas la capacité", () => {
    expect(
      verifierEtape(3, { ...COMPLETE, capacite_max: "5", capacite_min: "10" }),
    ).toMatchObject({ champ: "capacite_min" });
  });

  it("étape 3 : sans limite de places, le nombre saisi est ignoré et le minimum reste libre", () => {
    expect(
      verifierEtape(3, {
        ...COMPLETE,
        places: "sans_limite",
        capacite_max: "",
        capacite_min: "30",
      }),
    ).toEqual({});
  });
});

describe("conversion vers l'activité à publier", () => {
  it("reprend la saisie, avec les nombres convertis et le pictogramme de la catégorie", () => {
    expect(versNouvelleActivite(COMPLETE)).toEqual({
      titre: "Goûter crêpes",
      categorie: "moments_partages",
      pictogramme: "waving_hand",
      mot_accueil: "Venez comme vous êtes.",
      date_activite: "2026-10-24",
      heure_debut: "16:00",
      heure_fin: "18:30",
      lieu: "Jardin partagé",
      precision_acces: "Portail vert",
      capacite_max: 12,
      capacite_min: 4,
      etiquettes: ["acces_plain_pied", "enfants_bienvenus"],
      conseils_pratiques: "Une petite laine.",
      materiel_prevoir: "Poêles fournies.",
      a_apporter: "Une garniture.",
    });
  });

  it("les champs vides deviennent null, sans limite de places donne une capacité nulle", () => {
    expect(
      versNouvelleActivite({
        ...COMPLETE,
        places: "sans_limite",
        capacite_max: "12",
        capacite_min: "",
        precision_acces: "  ",
        mot_accueil: "",
        conseils_pratiques: "",
        materiel_prevoir: "",
        a_apporter: "",
        etiquettes: [],
      }),
    ).toMatchObject({
      capacite_max: null,
      capacite_min: null,
      precision_acces: null,
      mot_accueil: null,
      conseils_pratiques: null,
      materiel_prevoir: null,
      a_apporter: null,
      etiquettes: [],
    });
  });
});
