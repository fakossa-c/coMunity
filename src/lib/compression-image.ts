/** Plus grand côté d'une image compressée, en pixels. */
export const COTE_MAX = 1280;
/** Qualité JPEG de l'encodage, de 0 à 1. */
export const QUALITE = 0.8;
export const TYPE_SORTIE = "image/jpeg";

const TYPES_ACCEPTES = ["image/jpeg", "image/png", "image/webp"];

export type Dimensions = { largeur: number; hauteur: number };

/** Une image lue par le moteur : sa taille d'origine, de quoi la réencoder et de quoi la libérer. */
export type ImageDecodee = Dimensions & {
  encoder(dimensions: Dimensions, type: string, qualite: number): Promise<Blob>;
  liberer(): void;
};

/** Ce qui décode un fichier image : le navigateur par défaut, un faux dans les tests. */
export type MoteurImage = (fichier: Blob) => Promise<ImageDecodee>;

/** Vrai pour un format d'image courant : JPEG, PNG ou WebP. */
export function estImageAcceptee(type: string) {
  return TYPES_ACCEPTES.includes(type);
}

/** La taille d'une image compressée : son plus grand côté tient dans `COTE_MAX`, jamais agrandie. */
export function dimensionsApresCompression(
  largeur: number,
  hauteur: number,
): Dimensions {
  const echelle = Math.min(1, COTE_MAX / Math.max(largeur, hauteur));
  return {
    largeur: Math.max(1, Math.round(largeur * echelle)),
    hauteur: Math.max(1, Math.round(hauteur * echelle)),
  };
}

/**
 * Réduit et compresse une photo avant son envoi : JPEG à `QUALITE`, plus grand côté à `COTE_MAX`.
 * Toujours réencodée, même petite : le réencodage écarte les métadonnées de la photo, sa position
 * GPS comprise. Rejette avec un message à montrer tel quel.
 */
export async function compresserImage(
  fichier: Blob,
  moteur: MoteurImage = moteurNavigateur,
): Promise<Blob> {
  if (!estImageAcceptee(fichier.type))
    throw new Error("Choisissez une photo au format JPEG, PNG ou WebP.");

  let image: ImageDecodee;
  try {
    image = await moteur(fichier);
  } catch {
    throw new Error("Cette photo n'a pas pu être lue.");
  }
  try {
    return await image.encoder(
      dimensionsApresCompression(image.largeur, image.hauteur),
      TYPE_SORTIE,
      QUALITE,
    );
  } catch {
    throw new Error("Cette photo n'a pas pu être préparée.");
  } finally {
    image.liberer();
  }
}

/** Le moteur du navigateur : décodage par `createImageBitmap` (orientation EXIF appliquée), encodage par un canevas. */
export const moteurNavigateur: MoteurImage = async (fichier) => {
  const image = await createImageBitmap(fichier, {
    imageOrientation: "from-image",
  });
  return {
    largeur: image.width,
    hauteur: image.height,
    encoder({ largeur, hauteur }, type, qualite) {
      const canevas = document.createElement("canvas");
      canevas.width = largeur;
      canevas.height = hauteur;
      const contexte = canevas.getContext("2d");
      if (!contexte) throw new Error("Canevas indisponible.");
      // Le JPEG n'a pas de transparence : un PNG transparent passerait au noir sans ce fond.
      contexte.fillStyle = "#ffffff";
      contexte.fillRect(0, 0, largeur, hauteur);
      contexte.drawImage(image, 0, 0, largeur, hauteur);
      return new Promise<Blob>((resoudre, rejeter) =>
        canevas.toBlob(
          (blob) =>
            blob ? resoudre(blob) : rejeter(new Error("Encodage impossible.")),
          type,
          qualite,
        ),
      );
    },
    liberer: () => image.close(),
  };
};
