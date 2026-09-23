import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const racine = join(import.meta.dirname, "..");
const lire = (chemin: string) => readFileSync(join(racine, chemin), "utf8");

/** Variables déclarées dans .env.example, avec leur valeur. */
function variablesExemple() {
  return new Map(
    lire(".env.example")
      .split("\n")
      .map((ligne) => ligne.trim())
      .filter((ligne) => ligne && !ligne.startsWith("#"))
      .map((ligne) => {
        const [nom, ...valeur] = ligne.split("=");
        return [nom, valeur.join("=")] as const;
      }),
  );
}

/** Variables d'environnement lues par le code de l'app (hors tests). */
function variablesLues() {
  const fichiers = readdirSync(join(racine, "src"), {
    recursive: true,
    encoding: "utf8",
  }).filter((f) => /\.tsx?$/.test(f) && !/\.test\.tsx?$/.test(f));
  const noms = new Set<string>();
  for (const fichier of fichiers) {
    for (const [, nom] of lire(join("src", fichier)).matchAll(
      /process\.env\.([A-Z0-9_]+)/g,
    )) {
      noms.add(nom);
    }
  }
  return noms;
}

describe("configuration de production", () => {
  it("fait tourner les fonctions à Paris", () => {
    expect(JSON.parse(lire("vercel.json")).regions).toEqual(["cdg1"]);
  });

  it("ne porte aucune valeur dans le modèle de variables", () => {
    for (const [nom, valeur] of variablesExemple()) {
      expect(valeur, nom).toBe("");
    }
  });

  it("déclare dans le modèle chaque variable lue par l'app", () => {
    const declarees = variablesExemple();
    for (const nom of variablesLues()) {
      expect(declarees.has(nom), nom).toBe(true);
    }
  });
});
