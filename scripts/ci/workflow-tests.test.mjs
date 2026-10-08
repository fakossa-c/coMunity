// Garde du workflow de CI (spec #208, ticket #214). Le workflow ne se vérifie vraiment que par sa
// première exécution sur une PR ; ces tests tiennent ce que le dépôt peut tenir seul : le nom du
// contrôle que la vérification de PR exige est bien celui que GitHub affichera, les déclencheurs
// couvrent les deux branches protégées, et la fixture des polices suit `src/app/polices.ts`.
// Le YAML est lu comme du texte : pas de bibliothèque YAML dans les dépendances du projet.
import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const lire = (chemin) => readFileSync(chemin, "utf8");
// Absent, le workflow se lit vide : chaque test échoue pour lui-même au lieu d'un échec de module.
const workflow = existsSync(".github/workflows/tests.yml")
  ? lire(".github/workflows/tests.yml")
  : "";
const valeurs = JSON.parse(lire(".claude/orchestration.json"));

/** Les noms de job (clé `name:` à quatre espaces, sous `jobs:` puis l'identifiant du job). */
function nomsDesJobs(texte) {
  return [...texte.matchAll(/^ {4}name: (.+)$/gm)].map((m) =>
    m[1].trim().replace(/^["']|["']$/g, ""),
  );
}

describe("le nom du contrôle de CI", () => {
  it("est écrit dans le fichier de valeurs du projet", () => {
    expect(valeurs.controleCi).not.toBe("");
  });

  it("est celui du job du workflow, pour que la vérification de PR l'exige", () => {
    expect(nomsDesJobs(workflow)).toEqual([valeurs.controleCi]);
  });
});

describe("le workflow des tests", () => {
  it("se lance sur chaque PR vers develop et vers main", () => {
    expect(workflow).toMatch(
      /^on:\n {2}pull_request:\n {4}branches: \[develop, main\]/m,
    );
  });

  it("annule le run en cours d'une PR quand un nouveau commit arrive", () => {
    expect(workflow).toMatch(/concurrency:[\s\S]*cancel-in-progress: true/);
    expect(workflow).toMatch(/group: .*github\.(head_ref|ref)/);
  });

  it("borne explicitement la durée du job", () => {
    expect(workflow).toMatch(/^ {4}timeout-minutes: \d+$/m);
  });

  it("ne donne au job qu'une lecture du dépôt", () => {
    expect(workflow).toMatch(/permissions:\n {2}contents: read/);
  });

  it("n'appelle pas Claude", () => {
    expect(workflow.toLowerCase()).not.toContain("claude");
    expect(workflow.toLowerCase()).not.toContain("anthropic");
  });

  it("reproduit l'environnement de la VM : Node 22, polices simulées, navigateurs Playwright", () => {
    expect(workflow).toMatch(/node-version: 22/);
    expect(workflow).toContain("NEXT_FONT_GOOGLE_MOCKED_RESPONSES");
    expect(workflow).toContain(".github/polices-simulees.json");
    expect(workflow).toMatch(/playwright install/);
  });

  it("démarre le Supabase local par la CLI du projet et écrit les variables locales", () => {
    expect(workflow).toContain("npx supabase start");
    expect(workflow).toContain("npm run env:local");
  });

  it("lance la suite complète, jamais une partie", () => {
    expect(workflow).toMatch(/run: npm test$/m);
  });
});

describe("la fixture des polices simulées", () => {
  // Copie des réponses de l'API CSS de Google Fonts (UA Chrome/104, comme next/font). Pour la
  // régénérer après un changement de `src/app/polices.ts` : récupérer chaque URL avec curl.
  const fixture = JSON.parse(lire(".github/polices-simulees.json"));
  const source = lire("src/app/polices.ts");

  /** L'URL exacte que next/font demande pour chaque police Google du fichier : sa clé dans la fixture. */
  function urlsDemandees() {
    return [
      ...source.matchAll(
        /= ([A-Z][A-Za-z_]+)\(\{[\s\S]*?weight: \[([^\]]+)\]/g,
      ),
    ].map(([, famille, graisses]) => {
      const poids = graisses
        .replaceAll('"', "")
        .split(",")
        .map((g) => g.trim());
      return `https://fonts.googleapis.com/css2?family=${famille.replaceAll("_", "+")}:wght@${poids.join(";")}&display=swap`;
    });
  }

  it("répond, par l'URL exacte, à chaque police Google que l'application importe", () => {
    const urls = urlsDemandees();
    expect(urls).toHaveLength(2);
    for (const url of urls) expect(fixture).toHaveProperty([url]);
  });

  it("ne garde que des polices que l'application importe", () => {
    expect(Object.keys(fixture).sort()).toEqual(urlsDemandees().sort());
  });
});
