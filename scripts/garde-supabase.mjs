// Garde-fou des commandes Supabase lancées par Claude Code (hook PreToolUse, déclaré dans
// .claude/settings.json).
//
// Pourquoi : un worktree non isolé pilote le même conteneur Docker que le checkout principal et
// les autres worktrees ; un `db reset` y vide leur base (docs/incidents/2026-09-25-supabase-local-
// partage-entre-worktrees.md). Et un `db push` lancé depuis une branche de ticket met l'historique
// distant en avance sur develop (docs/incidents/2026-09-25-migration-appliquee-en-production.md).
//
// Entrée : le JSON du hook sur stdin. Sortie : code 2 et raison sur stderr pour bloquer, 0 sinon.
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";

const SUPABASE = String.raw`\bsupabase(?:\.js)?\s+`;
const LOCALE = new RegExp(
  `${SUPABASE}(?:start|stop|db\\s+reset|migration\\s+up)\\b`,
);
const PUSH = new RegExp(`${SUPABASE}db\\s+push\\b`);
const REPAIR = new RegExp(`${SUPABASE}migration\\s+repair\\b`);

/** La raison du blocage, ou null si la commande peut passer. */
export function verdict({ commande, estWorktree, projectId }) {
  if (PUSH.test(commande)) {
    return "Pas de `supabase db push` direct : `npm run db:pousser` depuis le checkout principal, sur develop à jour (vérifie l'ordre et l'historique), puis `npm run db:pousser -- --appliquer` avec l'accord de l'utilisateur.";
  }
  if (REPAIR.test(commande) && estWorktree) {
    return "`supabase migration repair` écrit sur la base distante : le lancer depuis le checkout principal, avec l'accord de l'utilisateur.";
  }
  if (LOCALE.test(commande) && estWorktree && projectId === "comunity") {
    return 'Supabase de ce worktree non isolé (project_id = "comunity", partagé avec les autres checkouts). Lancer d\'abord `node scripts/isoler-supabase-worktree.mjs` à la racine du worktree.';
  }
  return null;
}

/** Le dossier où la commande s'exécute, en suivant le dernier `cd` qui la précède. */
export function dossierCible(commande, cwd) {
  const cds = [
    ...commande.matchAll(/(?:^|&&|;|\|\|)\s*cd\s+("[^"]+"|'[^']+'|[^\s;&|]+)/g),
  ];
  if (cds.length === 0) return cwd;
  return resolve(cwd, cds.at(-1)[1].replace(/^["']|["']$/g, "")).replace(
    /\\/g,
    "/",
  );
}

function contexte(dossier) {
  const git = (...args) =>
    execFileSync("git", ["-C", dossier, ...args], { encoding: "utf8" }).trim();
  const [gitDir, commonDir] = git(
    "rev-parse",
    "--path-format=absolute",
    "--git-dir",
    "--git-common-dir",
  )
    .split("\n")
    .map((chemin) => resolve(chemin));
  const racine = git("rev-parse", "--show-toplevel");
  const config = readFileSync(join(racine, "supabase/config.toml"), "utf8");
  return {
    estWorktree: gitDir !== commonDir,
    projectId: config.match(/^project_id = "(.*)"$/m)?.[1],
  };
}

if (process.argv[1]?.endsWith("garde-supabase.mjs")) {
  const entree = JSON.parse(readFileSync(0, "utf8"));
  const commande = entree.tool_input?.command ?? "";
  if (!/\bsupabase\b/.test(commande)) process.exit(0);
  let raison;
  try {
    raison = verdict({
      commande,
      ...contexte(dossierCible(commande, entree.cwd)),
    });
  } catch {
    process.exit(0); // hors dépôt ou sans config Supabase : rien à garder
  }
  if (raison) {
    console.error(raison);
    process.exit(2);
  }
}
