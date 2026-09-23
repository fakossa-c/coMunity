// Teste le dépôt lui-même, pas un module : rangé dans src/ pour tourner avec les tests unitaires.
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const racine = join(import.meta.dirname, "..");
const lire = (chemin: string) => readFileSync(join(racine, chemin), "utf8");

/** Fichiers suivis par git. `-z` : noms accentués livrés tels quels, sans échappement. */
function fichiersSuivis() {
  return execFileSync("git", ["ls-files", "-z"], {
    cwd: racine,
    encoding: "utf8",
  })
    .split("\0")
    .filter(Boolean);
}

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

/** Variables d'environnement lues par l'app et ses scripts (hors tests). */
function variablesLues() {
  const sources = fichiersSuivis().filter(
    (f) =>
      /^(src|scripts)\//.test(f) &&
      /\.(tsx?|mjs)$/.test(f) &&
      !/\.test\.tsx?$/.test(f),
  );
  const noms = new Set<string>();
  for (const fichier of sources) {
    for (const [, nom] of lire(fichier).matchAll(
      /process\.env(?:\.|\[["'])([A-Z0-9_]+)/g,
    )) {
      noms.add(nom);
    }
  }
  return noms;
}

// Clé secrète Supabase, clé API Resend, ou jeton JWT (anciennes clés anon et service_role).
const motifCleSecrete =
  /\bsb_secret_[A-Za-z0-9_-]{10,}|\bre_[A-Za-z0-9]{8}_[A-Za-z0-9]{16,}|\beyJ[\w-]{10,}\.eyJ[\w-]{10,}\.[\w-]{10,}/;

describe("configuration de production", () => {
  it("fait tourner les fonctions à Paris", () => {
    expect(JSON.parse(lire("vercel.json")).regions).toEqual(["cdg1"]);
  });

  it("ne porte aucune valeur dans le modèle de variables", () => {
    for (const [nom, valeur] of variablesExemple()) {
      expect(valeur, nom).toBe("");
    }
  });

  it("ne commite aucune clé secrète", () => {
    const textes = fichiersSuivis().filter(
      (f) => !/\.(png|jpe?g|gif|webp|ico|woff2?|pdf)$/.test(f),
    );
    for (const fichier of textes) {
      expect(lire(fichier), fichier).not.toMatch(motifCleSecrete);
    }
  });

  it("déclare dans le modèle chaque variable lue par l'app", () => {
    const declarees = variablesExemple();
    for (const nom of variablesLues()) {
      expect(declarees.has(nom), nom).toBe(true);
    }
  });
});
