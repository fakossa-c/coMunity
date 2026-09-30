import { describe, expect, it } from "vitest";
import {
  MAX_PHOTOS,
  cheminPhoto,
  compteurPhoto,
  estCheminPhoto,
  libellePhotos,
  messagePhotosIncompletes,
  mettreEnPremier,
  retirerPhoto,
  texteAlternatif,
  urlPhoto,
} from "./photos-activite";

const ACTIVITE = "0b7d6c1e-3f5a-4a52-9d0e-6a1c2d3e4f50";
const PHOTO = "9f8e7d6c-5b4a-4392-8170-a1b2c3d4e5f6";

describe("chemin d'une photo", () => {
  it("range la photo dans le dossier de son activité", () => {
    expect(cheminPhoto(ACTIVITE, PHOTO)).toBe(`${ACTIVITE}/${PHOTO}.jpg`);
  });

  it("reconnaît un chemin produit par cheminPhoto, et lui seul", () => {
    expect(estCheminPhoto(`${ACTIVITE}/${PHOTO}.jpg`, ACTIVITE)).toBe(true);
    // Le dossier d'une autre activité, un sous-dossier, une remontée, un autre format.
    expect(estCheminPhoto(`${PHOTO}/${PHOTO}.jpg`, ACTIVITE)).toBe(false);
    expect(estCheminPhoto(`${ACTIVITE}/x/${PHOTO}.jpg`, ACTIVITE)).toBe(false);
    expect(estCheminPhoto(`${ACTIVITE}/../${PHOTO}.jpg`, ACTIVITE)).toBe(false);
    expect(estCheminPhoto(`${ACTIVITE}/${PHOTO}.png`, ACTIVITE)).toBe(false);
    expect(estCheminPhoto("", ACTIVITE)).toBe(false);
  });
});

describe("adresse publique", () => {
  it("pointe le bucket public des photos d'activité", () => {
    expect(urlPhoto("http://127.0.0.1:55100", `${ACTIVITE}/${PHOTO}.jpg`)).toBe(
      `http://127.0.0.1:55100/storage/v1/object/public/activites/${ACTIVITE}/${PHOTO}.jpg`,
    );
  });
});

describe("galerie", () => {
  it("le compteur dit le rang sur le total", () => {
    expect(compteurPhoto(1, 4)).toBe("1 sur 4");
    expect(compteurPhoto(4, 4)).toBe("4 sur 4");
  });

  it("le texte alternatif nomme l'activité et le rang de la photo", () => {
    expect(texteAlternatif("Goûter crêpes", 2, 4)).toBe(
      "Goûter crêpes, photo 2 sur 4",
    );
    // Une seule photo : pas de rang à dire.
    expect(texteAlternatif("Goûter crêpes", 1, 1)).toBe(
      "Goûter crêpes, photo de l'activité",
    );
  });
});

describe("liste de photos du parcours", () => {
  it("la limite est de 5 photos", () => {
    expect(MAX_PHOTOS).toBe(5);
  });

  it("mettre une photo en première garde l'ordre des autres", () => {
    expect(mettreEnPremier(["a", "b", "c", "d"], 2)).toEqual([
      "c",
      "a",
      "b",
      "d",
    ]);
    expect(mettreEnPremier(["a", "b"], 0)).toEqual(["a", "b"]);
  });

  it("retirer une photo garde l'ordre des autres", () => {
    expect(retirerPhoto(["a", "b", "c"], 1)).toEqual(["a", "c"]);
    expect(retirerPhoto(["a"], 0)).toEqual([]);
  });

  it("ne modifie pas la liste d'origine", () => {
    const liste = ["a", "b", "c"];
    mettreEnPremier(liste, 2);
    retirerPhoto(liste, 0);
    expect(liste).toEqual(["a", "b", "c"]);
  });
});

describe("libellés", () => {
  it("le nombre de photos s'accorde", () => {
    expect(libellePhotos(0)).toBe("Aucune photo");
    expect(libellePhotos(1)).toBe("1 photo");
    expect(libellePhotos(4)).toBe("4 photos");
  });

  it("le message d'une publication sans toutes ses photos dit ce qui a manqué", () => {
    expect(messagePhotosIncompletes(1, true)).toBe(
      "Votre activité est publiée, mais une photo n'a pas pu être envoyée. Ouvrez l'activité puis « Modifier » pour l'ajouter.",
    );
    expect(messagePhotosIncompletes(3, true)).toBe(
      "Votre activité est publiée, mais 3 photos n'ont pas pu être envoyées. Ouvrez l'activité puis « Modifier » pour les ajouter.",
    );
    // Toutes parties, mais la liste n'a pas pu être enregistrée : l'envoi n'est pas en cause.
    expect(messagePhotosIncompletes(0, false)).toBe(
      "Votre activité est publiée, mais ses photos n'ont pas pu être enregistrées. Ouvrez l'activité puis « Modifier » pour les ajouter.",
    );
  });
});
