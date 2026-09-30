import { describe, expect, it } from "vitest";
import {
  MAX_PHOTOS_ESPACE,
  cheminPhotoEspace,
  deplacerPhoto,
  estCheminPhotoEspace,
  texteAlternatifEspace,
  texteAlternatifPlan,
} from "./photo-espace-commun";

const PHOTO = "0b9d5a52-8c1e-4f3a-9d1b-2f6c7a8e9b10";

describe("cheminPhotoEspace", () => {
  it("nomme la photo d'après son identifiant, en JPEG, sans dossier", () => {
    expect(cheminPhotoEspace(PHOTO)).toBe(`${PHOTO}.jpg`);
  });
});

describe("estCheminPhotoEspace", () => {
  it("reconnaît un chemin produit par cheminPhotoEspace", () => {
    expect(estCheminPhotoEspace(cheminPhotoEspace(PHOTO))).toBe(true);
  });

  it("refuse tout le reste", () => {
    for (const chemin of [
      "",
      PHOTO,
      `${PHOTO}.png`,
      `dossier/${PHOTO}.jpg`,
      `../${PHOTO}.jpg`,
      `${PHOTO}.jpg/`,
      `${PHOTO.toUpperCase()}.jpg`,
      "photo.jpg",
    ])
      expect(estCheminPhotoEspace(chemin), chemin).toBe(false);
  });
});

describe("texteAlternatifEspace", () => {
  it("dit de quel espace commun la photo est", () => {
    expect(texteAlternatifEspace("Salle commune")).toBe(
      "Salle commune, photo de l'espace commun",
    );
  });
});

describe("texteAlternatifEspace avec plusieurs photos", () => {
  it("donne le rang de la photo quand il y en a plusieurs", () => {
    expect(texteAlternatifEspace("Salle commune", 2, 5)).toBe(
      "Salle commune, photo 2 sur 5",
    );
    expect(texteAlternatifEspace("Salle commune", 1, 1)).toBe(
      "Salle commune, photo de l'espace commun",
    );
  });
});

describe("texteAlternatifPlan", () => {
  it("dit de quel espace commun est le plan de situation", () => {
    expect(texteAlternatifPlan("Salle commune")).toBe(
      "Plan de situation de Salle commune",
    );
  });
});

describe("MAX_PHOTOS_ESPACE", () => {
  it("est la limite de la base : 5 photos par espace", () => {
    expect(MAX_PHOTOS_ESPACE).toBe(5);
  });
});

describe("deplacerPhoto", () => {
  it("monte ou descend une photo d'un rang, sans toucher la liste d'origine", () => {
    const liste = ["a", "b", "c"];

    expect(deplacerPhoto(liste, 1, -1)).toEqual(["b", "a", "c"]);
    expect(deplacerPhoto(liste, 1, 1)).toEqual(["a", "c", "b"]);
    expect(liste).toEqual(["a", "b", "c"]);
  });

  it("laisse la liste telle quelle au bout de la liste", () => {
    expect(deplacerPhoto(["a", "b"], 0, -1)).toEqual(["a", "b"]);
    expect(deplacerPhoto(["a", "b"], 1, 1)).toEqual(["a", "b"]);
  });
});
