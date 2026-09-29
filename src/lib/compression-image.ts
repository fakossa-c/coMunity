/** Plus grand côté d'une image compressée, en pixels. */
export const COTE_MAX = 1280;
/** Qualité JPEG de l'encodage, de 0 à 1. */
export const QUALITE = 0.8;
export const TYPE_SORTIE = "image/jpeg";

export type Dimensions = { largeur: number; hauteur: number };

/** Une image lue par le moteur : sa taille d'origine, de quoi la réencoder et de quoi la libérer. */
export type ImageDecodee = Dimensions & {
  encoder(dimensions: Dimensions, type: string, qualite: number): Promise<Blob>;
  liberer(): void;
};

/** Ce qui décode un fichier image : le navigateur par défaut, un faux dans les tests. */
export type MoteurImage = (fichier: Blob) => Promise<ImageDecodee>;

export function estImageAcceptee(_type: string): boolean {
  throw new Error("à écrire");
}

export function dimensionsApresCompression(
  _largeur: number,
  _hauteur: number,
): Dimensions {
  throw new Error("à écrire");
}

export async function compresserImage(
  _fichier: Blob,
  _moteur: MoteurImage,
): Promise<Blob> {
  throw new Error("à écrire");
}
