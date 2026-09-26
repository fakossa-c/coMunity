// Applique les migrations de supabase/migrations/ au Supabase distant, qui sert à la fois la
// production et les previews : un seul chemin, avec ses vérifications.
//
// Pourquoi : une migration poussée depuis une branche de ticket met l'historique distant en avance
// sur develop, et le `db push` suivant échoue pour tout le monde (tickets #12 et #16) ; une
// migration plus ancienne que la dernière distante est refusée ; et le code de production (main)
// tourne sur cette base avant d'avoir reçu les changements de develop.
//
// Usage, depuis le checkout principal sur develop à jour :
//   npm run db:pousser                 vérifie et liste ce qui partirait, n'écrit rien
//   npm run db:pousser -- --appliquer  pousse, avec l'accord de l'utilisateur
import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * L'historique écrit par `supabase migration list --linked`. Hors terminal, le CLI écrit du JSON ;
 * avec `--output json`, contre toute attente, il écrit un tableau.
 */
export function lireHistorique(sortie) {
  const debut = sortie.indexOf("{");
  if (debut === -1) {
    throw new Error(
      `JSON attendu de \`supabase migration list\`, reçu :\n${sortie.slice(0, 300)}`,
    );
  }
  return JSON.parse(sortie.slice(debut)).migrations;
}

/** Compare l'historique local et distant, tel que le lit `lireHistorique`. */
export function analyser(migrations) {
  const distantes = migrations.map((m) => m.remote).filter(Boolean);
  const derniereDistante = distantes.sort().at(-1) ?? "";
  const aPousser = migrations
    .filter((m) => m.local && !m.remote)
    .map((m) => m.local);
  return {
    aPousser,
    absentesEnLocal: migrations
      .filter((m) => m.remote && !m.local)
      .map((m) => m.remote),
    horsOrdre: aPousser.filter((version) => version < derniereDistante),
  };
}

/** Les lignes qui retirent ou renomment ce que le code de production lit peut-être encore. */
export function instructionsRisquees(sql) {
  return sql
    .split("\n")
    .filter((ligne) =>
      /\bdrop\s+(column|table)\b|\brename\s+(column\s+)?\w+\s+to\b|\brename\s+to\b|\balter\s+column\s+\w+\s+(set\s+data\s+)?type\b/i.test(
        ligne,
      ),
    )
    .map((ligne) => ligne.trim());
}

function arreter(message) {
  console.error(message);
  process.exit(1);
}

if (process.argv[1]?.endsWith("pousser-migrations.mjs")) {
  const appliquer = process.argv.includes("--appliquer");
  const git = (...args) =>
    execFileSync("git", args, { encoding: "utf8" }).trim();
  const supabase = (...args) =>
    execFileSync(
      process.execPath,
      [join(process.cwd(), "node_modules/supabase/dist/supabase.js"), ...args],
      {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
      },
    );

  const [gitDir, commonDir] = git(
    "rev-parse",
    "--path-format=absolute",
    "--git-dir",
    "--git-common-dir",
  ).split("\n");
  if (gitDir !== commonDir) {
    arreter(
      "Depuis le checkout principal seulement : un worktree ne retrouve pas le mot de passe de la base distante.",
    );
  }
  if (git("branch", "--show-current") !== "develop") {
    arreter(
      "Depuis develop seulement : une migration part après la fusion de sa PR, jamais depuis une branche de ticket.",
    );
  }
  git("fetch", "--quiet", "origin", "develop");
  if (git("rev-parse", "HEAD") !== git("rev-parse", "origin/develop")) {
    arreter(
      "develop n'est pas à jour avec origin/develop : `git pull` d'abord.",
    );
  }
  if (git("status", "--porcelain", "--", "supabase/migrations")) {
    arreter(
      "supabase/migrations/ a des modifications non commitées : seules les migrations fusionnées partent.",
    );
  }

  const { aPousser, absentesEnLocal, horsOrdre } = analyser(
    lireHistorique(supabase("migration", "list", "--linked")),
  );

  if (absentesEnLocal.length) {
    arreter(
      `Migrations présentes en distant mais pas dans develop : ${absentesEnLocal.join(", ")}.\n` +
        "Une branche les a poussées avant sa fusion. Fusionner sa PR, puis relancer.",
    );
  }
  if (horsOrdre.length) {
    arreter(
      `Migrations plus anciennes que la dernière distante : ${horsOrdre.join(", ")}.\n` +
        "Les renommer avec un horodatage postérieur (dans une PR), puis relancer.",
    );
  }
  if (!aPousser.length) {
    console.log("Base distante à jour : rien à pousser.");
    process.exit(0);
  }

  console.log(`À pousser vers la base de production : ${aPousser.join(", ")}`);
  const risques = aPousser.flatMap((version) => {
    const fichier = readdirSync("supabase/migrations").find((nom) =>
      nom.startsWith(version),
    );
    return instructionsRisquees(
      readFileSync(join("supabase/migrations", fichier), "utf8"),
    ).map((ligne) => `  ${fichier} : ${ligne}`);
  });
  if (risques.length) {
    console.log(
      "\nCes lignes retirent ou renomment un élément que le code de production (main) lit peut-être encore :\n" +
        `${risques.join("\n")}\n` +
        "Les pousser seulement quand main n'en dépend plus (fusion develop -> main faite), avec --accepter-risque.",
    );
  }

  if (!appliquer) {
    console.log(
      "\nVérification seule. Pour pousser : npm run db:pousser -- --appliquer",
    );
    process.exit(0);
  }
  if (risques.length && !process.argv.includes("--accepter-risque")) {
    arreter("\nArrêt : lignes à risque sans --accepter-risque.");
  }
  execFileSync(
    process.execPath,
    [
      join(process.cwd(), "node_modules/supabase/dist/supabase.js"),
      "db",
      "push",
      "--linked",
      "--yes",
    ],
    { stdio: "inherit" },
  );
}
