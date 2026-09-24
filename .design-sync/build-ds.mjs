// Construit la petite bibliothèque que Claude Design consomme (design-sync) : la charte
// Warm Commons et les composants de présentation de l'app, sortis de Next.js.
// Sortie : .design-sync/.cache/pkg (non versionnée), point d'entrée dist/index.js.
// Relancer avant chaque synchro : `node .design-sync/build-ds.mjs`.
import { execFileSync } from "node:child_process";
import {
  cpSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { fileURLToPath } from "node:url";
import postcss from "postcss";
import tailwind from "@tailwindcss/postcss";

const depuisRacine = (chemin) =>
  fileURLToPath(new URL(`../${chemin}`, import.meta.url));

// Composants partagés avec Claude Design : présentation pure, sans Next.js ni Supabase.
const COMPOSANTS = ["icone", "icones", "titre-page", "bientot"];

const PKG = depuisRacine(".design-sync/.cache/pkg");
rmSync(PKG, { recursive: true, force: true });
mkdirSync(`${PKG}/src`, { recursive: true });
mkdirSync(`${PKG}/dist`, { recursive: true });

for (const nom of COMPOSANTS) {
  const extension = nom === "icones" ? "ts" : "tsx";
  cpSync(
    depuisRacine(`src/components/${nom}.${extension}`),
    `${PKG}/src/${nom}.${extension}`,
  );
}
writeFileSync(
  `${PKG}/src/index.ts`,
  [
    'export { Icone } from "./icone";',
    'export { TitrePage } from "./titre-page";',
    'export { Bientot } from "./bientot";',
    'export type { NomIcone } from "./icones";',
    "",
  ].join("\n"),
);

writeFileSync(
  `${PKG}/package.json`,
  JSON.stringify(
    {
      name: "comunity-ds",
      version: "0.1.0",
      type: "module",
      module: "dist/index.js",
      types: "dist/index.d.ts",
      peerDependencies: { react: "*" },
    },
    null,
    2,
  ),
);
writeFileSync(
  `${PKG}/tsconfig.json`,
  JSON.stringify(
    {
      compilerOptions: {
        target: "ES2020",
        module: "ESNext",
        moduleResolution: "bundler",
        jsx: "react-jsx",
        declaration: true,
        strict: true,
        skipLibCheck: true,
        rootDir: "src",
        outDir: "dist",
        types: [],
      },
      include: ["src"],
    },
    null,
    2,
  ),
);
execFileSync(
  process.execPath,
  [
    depuisRacine("node_modules/typescript/bin/tsc"),
    "-p",
    `${PKG}/tsconfig.json`,
  ],
  { stdio: "inherit" },
);

// Feuille de styles : la charte de l'app (globals.css), avec toutes les variables de la
// charte émises (les designs de Claude Design s'en servent même si l'app ne les utilise
// pas encore) et les polices chargées depuis Google Fonts, là où l'app passe par next/font.
const globals = readFileSync(depuisRacine("src/app/globals.css"), "utf8");
if (
  !globals.includes('@import "tailwindcss";') ||
  !globals.includes("@theme {")
) {
  throw new Error(
    "globals.css n'a plus la forme attendue (@import tailwindcss, @theme)",
  );
}
const entree = [
  '@import url("https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible+Next:wght@400;700&family=Plus+Jakarta+Sans:wght@600;700;800&display=swap");',
  globals
    .replace("@theme {", "@theme static {")
    .replace(
      '@import "tailwindcss";',
      [
        '@import "tailwindcss" source(none);',
        '@source "./src";',
        '@source "../../previews";',
        "",
        ":root {",
        '  --font-plus-jakarta: "Plus Jakarta Sans";',
        '  --font-atkinson: "Atkinson Hyperlegible Next";',
        "}",
      ].join("\n"),
    ),
].join("\n");
const cheminEntree = `${PKG}/styles.src.css`;
writeFileSync(cheminEntree, entree);
const { css } = await postcss([tailwind({ base: PKG })]).process(entree, {
  from: cheminEntree,
});
writeFileSync(`${PKG}/dist/styles.css`, css);

// Guides lus par l'agent de Claude Design (copiés dans guidelines/ par le convertisseur).
cpSync(
  depuisRacine("docs/design/warm_commons/DESIGN.md"),
  `${PKG}/warm-commons.md`,
);
cpSync(
  depuisRacine(".design-sync/guidelines/intention-app.md"),
  `${PKG}/intention-app.md`,
);

console.log(`Bibliothèque prête : ${PKG}`);
