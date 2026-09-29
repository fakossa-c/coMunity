import { describe, expect, it, vi } from "vitest";
import {
  COTE_MAX,
  QUALITE,
  TYPE_SORTIE,
  compresserImage,
  dimensionsApresCompression,
  estImageAcceptee,
  type ImageDecodee,
} from "./compression-image";

/** Une image décodée factice : `encoder` rend un fichier dont on lit les réglages dans son contenu. */
function imageFactice(largeur: number, hauteur: number) {
  const image: ImageDecodee = {
    largeur,
    hauteur,
    encoder: vi.fn(
      async (dimensions, type) =>
        new Blob([JSON.stringify(dimensions)], { type }),
    ),
    liberer: vi.fn(),
  };
  return image;
}

const PHOTO = new Blob(["octets"], { type: "image/png" });

describe("formats acceptés", () => {
  it("accepte JPEG, PNG et WebP", () => {
    expect(estImageAcceptee("image/jpeg")).toBe(true);
    expect(estImageAcceptee("image/png")).toBe(true);
    expect(estImageAcceptee("image/webp")).toBe(true);
  });

  it("refuse le reste : GIF, SVG, PDF, type inconnu", () => {
    for (const type of ["image/gif", "image/svg+xml", "application/pdf", ""]) {
      expect(estImageAcceptee(type)).toBe(false);
    }
  });
});

describe("dimensions après compression", () => {
  it("le plus grand côté tient dans la limite, les proportions gardées", () => {
    expect(dimensionsApresCompression(4000, 3000)).toEqual({
      largeur: COTE_MAX,
      hauteur: 960,
    });
    expect(dimensionsApresCompression(3000, 4000)).toEqual({
      largeur: 960,
      hauteur: COTE_MAX,
    });
  });

  it("ne grossit jamais une image déjà plus petite", () => {
    expect(dimensionsApresCompression(800, 600)).toEqual({
      largeur: 800,
      hauteur: 600,
    });
  });

  it("garde au moins un pixel sur le petit côté", () => {
    expect(dimensionsApresCompression(20_000, 10)).toEqual({
      largeur: COTE_MAX,
      hauteur: 1,
    });
  });
});

describe("compression d'une image", () => {
  it("réencode en JPEG aux réglages fixés, réduite à la limite", async () => {
    const image = imageFactice(4000, 3000);
    const resultat = await compresserImage(PHOTO, async () => image);

    expect(image.encoder).toHaveBeenCalledWith(
      { largeur: COTE_MAX, hauteur: 960 },
      TYPE_SORTIE,
      QUALITE,
    );
    expect(resultat.type).toBe("image/jpeg");
    expect(await resultat.text()).toBe(
      JSON.stringify({ largeur: COTE_MAX, hauteur: 960 }),
    );
  });

  it("réencode aussi une petite image : la position GPS d'une photo ne part pas", async () => {
    const image = imageFactice(640, 480);
    await compresserImage(PHOTO, async () => image);
    expect(image.encoder).toHaveBeenCalledWith(
      { largeur: 640, hauteur: 480 },
      TYPE_SORTIE,
      QUALITE,
    );
  });

  it("libère l'image décodée, même quand l'encodage échoue", async () => {
    const image = imageFactice(100, 100);
    image.encoder = vi.fn().mockRejectedValue(new Error("canvas"));

    await expect(compresserImage(PHOTO, async () => image)).rejects.toThrow(
      "Cette photo n'a pas pu être préparée.",
    );
    expect(image.liberer).toHaveBeenCalledOnce();
  });

  it("refuse un format non accepté sans même décoder", async () => {
    const decoder = vi.fn();
    const gif = new Blob(["GIF89a"], { type: "image/gif" });

    await expect(compresserImage(gif, decoder)).rejects.toThrow(
      "Choisissez une photo au format JPEG, PNG ou WebP.",
    );
    expect(decoder).not.toHaveBeenCalled();
  });

  it("dit que la photo est illisible quand le décodage échoue", async () => {
    await expect(
      compresserImage(PHOTO, async () => {
        throw new Error("corrompue");
      }),
    ).rejects.toThrow("Cette photo n'a pas pu être lue.");
  });
});
