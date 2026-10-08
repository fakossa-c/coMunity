import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// Les fichiers déjà passés au jour de Paris (tickets #202 et #204). Un fichier s'ajoute ici quand il est corrigé.
const FICHIERS_AU_JOUR_DE_PARIS = [
  "demo-comptes.test.ts",
  "suppression-compte.test.ts",
  "tableau-de-bord.test.ts",
  "moderation-activites.test.ts",
  "gestion-activite.test.ts",
  "parcours-creation.test.ts",
  "photos-activite.test.ts",
  "pre-moderation-jev.test.ts",
];

describe("tests base : les jours viennent de paris.ts", () => {
  it.each(FICHIERS_AU_JOUR_DE_PARIS)(
    "%s ne calcule aucun jour sur toISOString() (le jour d'UTC retarde de 1 jour entre minuit et 2h à Paris)",
    (nom) => {
      const source = readFileSync(new URL(nom, import.meta.url), "utf8");
      expect(source).not.toMatch(/toISOString\(\)\s*\.slice\(0,\s*10\)/);
    },
  );
});
