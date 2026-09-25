// Produit les icônes de l'app installable à partir du symbole coMunity (le M formé de deux
// mains), fichier du design system : docs/design/assets/symbole.png, fond déjà transparent.
// À relancer si le symbole change : `node scripts/generer-icones.mjs`, puis commiter les PNG.
// sharp est fourni avec Next.js, qui s'en sert pour optimiser les images.
import { mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const racine = (chemin) =>
  fileURLToPath(new URL(`../${chemin}`, import.meta.url));

const SYMBOLE = racine("docs/design/assets/symbole.png");
// Fond de page du design system (`surface`), le même que `background_color` du manifeste.
const FOND = { r: 0xf8, g: 0xf9, b: 0xff, alpha: 1 };

// `part` : plus grand côté du symbole rapporté au côté de l'icône. L'icône « maskable » garde
// le symbole dans le cercle central de 80 % que tout lanceur Android laisse visible.
const ICONES = [
  { fichier: "src/app/icon.png", cote: 64, part: 0.94 },
  { fichier: "src/app/apple-icon.png", cote: 180, part: 0.8 },
  { fichier: "public/icon-192.png", cote: 192, part: 0.84 },
  { fichier: "public/icon-512.png", cote: 512, part: 0.84 },
  { fichier: "public/icon-maskable-512.png", cote: 512, part: 0.64 },
];

mkdirSync(racine("public"), { recursive: true });
// Les marges transparentes du fichier sont retirées : `part` porte sur le dessin seul.
const symbole = await sharp(SYMBOLE).trim().png().toBuffer();
for (const { fichier, cote, part } of ICONES) {
  const taille = Math.round(cote * part);
  const dessin = await sharp(symbole)
    .resize({
      width: taille,
      height: taille,
      fit: "inside",
      kernel: "lanczos3",
    })
    .png()
    .toBuffer();
  await sharp({
    create: { width: cote, height: cote, channels: 4, background: FOND },
  })
    .composite([{ input: dessin, gravity: "center" }])
    .flatten({ background: FOND })
    .png({ compressionLevel: 9 })
    .toFile(racine(fichier));
  console.log(`${fichier} (${cote} px)`);
}
