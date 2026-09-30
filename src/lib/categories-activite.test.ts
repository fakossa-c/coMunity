import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  categoriesActivite,
  categoriesActiviteListe,
} from "./categories-activite";

const lire = (chemin: string) =>
  readFileSync(new URL(`../../${chemin}`, import.meta.url), "utf8");

/** Les `--color-*: #hex` d'un bloc de CSS, par nom de jeton. */
function jetons(css: string) {
  const valeurs: Record<string, string> = {};
  for (const [, nom, hex] of css.matchAll(
    /(--color-[a-z0-9-]+):\s*(#[0-9a-f]{6})\s*;/gi,
  )) {
    valeurs[nom] = hex.toLowerCase();
  }
  return valeurs;
}

/** Contraste WCAG 2 entre deux couleurs `#rrggbb`. */
function contraste(a: string, b: string) {
  const luminance = (hex: string) => {
    const [r, v, bl] = [1, 3, 5].map((i) => {
      const c = parseInt(hex.slice(i, i + 2), 16) / 255;
      return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * v + 0.0722 * bl;
  };
  const [clair, sombre] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (clair + 0.05) / (sombre + 0.05);
}

const globals = lire("src/app/globals.css");
const debutSombre = globals.indexOf('[data-theme="sombre"] {');
const finSombre = globals.indexOf("\n}", debutSombre);

/** Les quatre endroits qui déclarent les couleurs : design system et app, clair et sombre. */
const declarations = {
  "colors.css (clair)": jetons(lire("docs/design/tokens/colors.css")),
  "theme-sombre.css (sombre)": jetons(
    lire("docs/design/tokens/theme-sombre.css"),
  ),
  "globals.css (clair)": jetons(globals.slice(0, debutSombre)),
  "globals.css (sombre)": jetons(globals.slice(debutSombre, finSombre)),
};

/** `bg-categorie-jardin-nature` → `--color-categorie-jardin-nature`. */
const jetonDeClasse = (classe: string) =>
  `--color-${classe.replace(/^(bg|text)-/, "")}`;

describe("couleur d'une catégorie d'activité", () => {
  it("chaque catégorie a son fond et son encre, différents de ceux des autres", () => {
    const fonds = categoriesActiviteListe.map(
      (c) => categoriesActivite[c].couleur.fond,
    );
    const encres = categoriesActiviteListe.map(
      (c) => categoriesActivite[c].couleur.encre,
    );
    expect(new Set(fonds).size).toBe(5);
    expect(new Set(encres).size).toBe(5);
  });

  for (const [lieu, valeurs] of Object.entries(declarations)) {
    describe(lieu, () => {
      it.each(categoriesActiviteListe)(
        "%s : fond et encre déclarés, contraste d'au moins 4,5:1",
        (categorie) => {
          const { fond, encre } = categoriesActivite[categorie].couleur;
          const valeurFond = valeurs[jetonDeClasse(fond)];
          const valeurEncre = valeurs[jetonDeClasse(encre)];
          expect(valeurFond, jetonDeClasse(fond)).toBeDefined();
          expect(valeurEncre, jetonDeClasse(encre)).toBeDefined();
          expect(contraste(valeurFond, valeurEncre)).toBeGreaterThanOrEqual(
            4.5,
          );
        },
      );

      it("aucun fond de catégorie ne reprend la pêche, le vert ou l'abricot", () => {
        const reserves = [
          valeurs["--color-primary-fixed"],
          valeurs["--color-secondary-fixed"],
          valeurs["--color-tertiary-fixed"],
        ];
        for (const categorie of categoriesActiviteListe) {
          const fond =
            valeurs[jetonDeClasse(categoriesActivite[categorie].couleur.fond)];
          expect(reserves).not.toContain(fond);
        }
      });
    });
  }

  it("le design system et l'app déclarent les mêmes couleurs", () => {
    const jetonsCategories = (v: Record<string, string>) =>
      Object.fromEntries(
        Object.entries(v).filter(([nom]) => nom.includes("categorie-")),
      );
    const clair = declarations["colors.css (clair)"];
    const sombre = declarations["theme-sombre.css (sombre)"];
    expect(jetonsCategories(clair)).toEqual(
      jetonsCategories(declarations["globals.css (clair)"]),
    );
    expect(jetonsCategories(sombre)).toEqual(
      jetonsCategories(declarations["globals.css (sombre)"]),
    );
  });
});
