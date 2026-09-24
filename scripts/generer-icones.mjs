// Produit les icônes de l'app installable à partir du logo des maquettes.
// Seul l'emblème est gardé (deux maisons, le cœur, la poignée de main) : le mot
// « COMMUNITY » deviendrait illisible sous l'icône d'un téléphone.
// À relancer si le logo change : `node scripts/generer-icones.mjs`, puis commiter les PNG.
// sharp est fourni avec Next.js, qui s'en sert pour optimiser les images.
import { mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const racine = (chemin) =>
  fileURLToPath(new URL(`../${chemin}`, import.meta.url));

const LOGO = racine("docs/design/logo_notre_immeuble_solidaire/screen.png");
// Le mot « COMMUNITY » commence plus bas : l'emblème tient au-dessus de cette ligne.
const BAS_EMBLEME = 630;
// Fond Warm Commons (`surface`), le même que `background_color` du manifeste.
const FOND = { r: 0xf8, g: 0xf9, b: 0xff, alpha: 1 };

// `part` : largeur de l'emblème rapportée au côté de l'icône. L'icône « maskable » garde
// l'emblème dans le cercle central de 80 % que tout lanceur Android laisse visible.
const ICONES = [
  { fichier: "src/app/icon.png", cote: 64, part: 0.94 },
  { fichier: "src/app/apple-icon.png", cote: 180, part: 0.8 },
  { fichier: "public/icon-192.png", cote: 192, part: 0.84 },
  { fichier: "public/icon-512.png", cote: 512, part: 0.84 },
  { fichier: "public/icon-maskable-512.png", cote: 512, part: 0.64 },
];

mkdirSync(racine("public"), { recursive: true });
const embleme = await extraireEmbleme();
for (const { fichier, cote, part } of ICONES) {
  const dessin = await sharp(embleme.pixels, { raw: embleme.format })
    .resize({ width: Math.round(cote * part), kernel: "lanczos3" })
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

/** Détoure l'emblème : le fond gris clair du logo devient transparent. */
async function extraireEmbleme() {
  const { data, info } = await sharp(LOGO)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width, channels } = info;
  const fond = [data[0], data[1], data[2]];

  let gauche = width,
    droite = 0,
    haut = BAS_EMBLEME,
    bas = 0;
  for (let y = 0; y < BAS_EMBLEME; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * channels;
      const ecart = Math.max(
        ...fond.map((valeur, canal) => Math.abs(data[i + canal] - valeur)),
      );
      // Transition douce entre le fond et le trait pour garder des bords lissés.
      const opacite = Math.min(1, Math.max(0, (ecart - 12) / 36));
      data[i + 3] = Math.round(opacite * 255);
      if (opacite > 0.5) {
        gauche = Math.min(gauche, x);
        droite = Math.max(droite, x);
        haut = Math.min(haut, y);
        bas = Math.max(bas, y);
      }
    }
  }

  const largeur = droite - gauche + 1;
  const hauteur = bas - haut + 1;
  const pixels = Buffer.alloc(largeur * hauteur * channels);
  for (let y = 0; y < hauteur; y++) {
    const debut = ((haut + y) * width + gauche) * channels;
    data.copy(
      pixels,
      y * largeur * channels,
      debut,
      debut + largeur * channels,
    );
  }
  return { pixels, format: { width: largeur, height: hauteur, channels } };
}
