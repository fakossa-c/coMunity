import { describe, expect, it } from "vitest";
import {
  cheminPhotoSyndic,
  estCheminPhotoSyndic,
  initialeFiche,
  lienEmail,
  lienTelephone,
  LIMITES_FICHE,
  nomFiche,
  saisieDepuisFiche,
  verifierFiche,
  versLigneFiche,
  type FicheSyndic,
  type SaisieFiche,
} from "./fiche-syndic";

const SAISIE: SaisieFiche = {
  prenom: "Nadia",
  nom: "Benali",
  telephone: "01 23 45 67 89",
  email: "nadia.benali@cabinet-exemple.fr",
  compteId: "",
};

describe("verifierFiche", () => {
  it("accepte une fiche complète, et une fiche réduite au prénom et au nom", () => {
    expect(verifierFiche(SAISIE)).toEqual({});
    expect(
      verifierFiche({ ...SAISIE, telephone: "", email: "", compteId: "" }),
    ).toEqual({});
  });

  it("demande le prénom puis le nom, sous leur champ", () => {
    expect(verifierFiche({ ...SAISIE, prenom: "  " })).toEqual({
      champ: "prenom",
      erreur: "Saisissez le prénom.",
    });
    expect(verifierFiche({ ...SAISIE, nom: "" })).toEqual({
      champ: "nom",
      erreur: "Saisissez le nom.",
    });
  });

  it("limite la longueur du prénom et du nom", () => {
    const trop = "a".repeat(LIMITES_FICHE.identite + 1);
    expect(verifierFiche({ ...SAISIE, prenom: trop }).champ).toBe("prenom");
    expect(verifierFiche({ ...SAISIE, nom: trop }).champ).toBe("nom");
  });

  it("refuse un téléphone qui n'en est pas un", () => {
    for (const telephone of ["appelez-moi", "12", "01 23 45 67 89 poste 4"]) {
      expect(verifierFiche({ ...SAISIE, telephone }).champ, telephone).toBe(
        "telephone",
      );
    }
    for (const telephone of [
      "0123456789",
      "01.23.45.67.89",
      "+33 1 23 45 67 89",
      "(01) 23 45 67 89",
    ]) {
      expect(verifierFiche({ ...SAISIE, telephone }), telephone).toEqual({});
    }
  });

  it("refuse un e-mail incomplet", () => {
    expect(verifierFiche({ ...SAISIE, email: "nadia@cabinet" })).toMatchObject({
      champ: "email",
    });
  });
});

describe("versLigneFiche", () => {
  it("retire les espaces autour et range en null ce qui est vide", () => {
    expect(
      versLigneFiche({
        prenom: " Nadia ",
        nom: " Benali ",
        telephone: " ",
        email: "",
        compteId: "",
      }),
    ).toEqual({
      prenom: "Nadia",
      nom: "Benali",
      telephone: null,
      email: null,
      compte_id: null,
    });
  });

  it("garde le téléphone tel que saisi, et met l'e-mail en minuscules", () => {
    expect(
      versLigneFiche({
        ...SAISIE,
        email: " Nadia.Benali@Cabinet-Exemple.fr ",
        compteId: "c1",
      }),
    ).toMatchObject({
      telephone: "01 23 45 67 89",
      email: "nadia.benali@cabinet-exemple.fr",
      compte_id: "c1",
    });
  });
});

describe("liens de contact", () => {
  it("le téléphone devient un lien tel: sans espace ni ponctuation", () => {
    expect(lienTelephone("01 23 45 67 89")).toBe("tel:0123456789");
    expect(lienTelephone("+33 (0)1.23.45.67.89")).toBe("tel:+330123456789");
  });

  it("l'e-mail devient un lien mailto:", () => {
    expect(lienEmail("nadia@cabinet-exemple.fr")).toBe(
      "mailto:nadia@cabinet-exemple.fr",
    );
  });
});

describe("identité de la fiche", () => {
  it("l'initiale est celle du prénom, en majuscule", () => {
    expect(initialeFiche({ prenom: "élodie", nom: "Roux" })).toBe("É");
  });

  it("le nom se lit prénom puis nom", () => {
    expect(nomFiche({ prenom: "Nadia", nom: "Benali" })).toBe("Nadia Benali");
  });
});

describe("chemin de la photo", () => {
  it("un chemin produit par cheminPhotoSyndic est reconnu, rien d'autre", () => {
    const chemin = cheminPhotoSyndic("3f2b8a4e-1c5d-4e6f-9a7b-0c1d2e3f4a5b");
    expect(chemin).toBe("3f2b8a4e-1c5d-4e6f-9a7b-0c1d2e3f4a5b.jpg");
    expect(estCheminPhotoSyndic(chemin)).toBe(true);
    for (const autre of [
      "photo.jpg",
      "../3f2b8a4e-1c5d-4e6f-9a7b-0c1d2e3f4a5b.jpg",
      "3f2b8a4e-1c5d-4e6f-9a7b-0c1d2e3f4a5b.png",
      "dossier/3f2b8a4e-1c5d-4e6f-9a7b-0c1d2e3f4a5b.jpg",
    ]) {
      expect(estCheminPhotoSyndic(autre), autre).toBe(false);
    }
  });
});

describe("saisieDepuisFiche", () => {
  it("remplit le formulaire d'une fiche, les champs absents restent vides", () => {
    const fiche: FicheSyndic = {
      id: "f1",
      prenom: "Nadia",
      nom: "Benali",
      telephone: null,
      email: "nadia@cabinet-exemple.fr",
      photo_chemin: null,
      compte_id: "c1",
      sur_comunity: true,
    };
    expect(saisieDepuisFiche(fiche)).toEqual({
      prenom: "Nadia",
      nom: "Benali",
      telephone: "",
      email: "nadia@cabinet-exemple.fr",
      compteId: "c1",
    });
  });
});
