import { describe, expect, it } from "vitest";
import {
  cheminPhotoEspace,
  estCheminPhotoEspace,
  texteAlternatifEspace,
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
