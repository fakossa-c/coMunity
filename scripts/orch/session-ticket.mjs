// Ce que les hooks de la session de ticket (spec #208, ticket #215) ont en commun : reconnaître un
// worktree de ticket, lire l'état git du worktree, et le marqueur du dernier `npm test` vert.
//
// Les fonctions pures sont testées (session-ticket.test.mjs) ; `contexteGit` et `lireMarqueur`
// touchent git et le disque et restent minces. Pas d'import de commun.mjs : le hook avant outil
// tourne avant chaque commande Bash, il ne charge que ce qu'il lui faut.
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";

/** Le marqueur est ignoré par git (`.gitignore`) : il ne salit jamais l'arbre qu'il décrit. */
export const FICHIER_MARQUEUR = ".claude/test-vert.json";

/** Le numéro du ticket si `racine` est un worktree de ticket (`<…>/worktrees/ticket-<n>`), sinon
 * null. Le dossier fait foi, pas la branche : une session qui a quitté sa branche reste une
 * session de ticket. Accepte les chemins Windows comme les chemins POSIX. */
export function ticketDuWorktree({ estWorktree, racine }) {
  if (!estWorktree) return null;
  const segments = racine.split(/[\\/]/).filter(Boolean);
  const numero = segments.at(-1)?.match(/^ticket-(\d+)$/)?.[1];
  return numero && segments.at(-2) === "worktrees" ? Number(numero) : null;
}

/** Le contenu du marqueur : le commit testé et si l'arbre avait des modifications non commitées. */
export const marqueurDeTest = ({ commit, arbreSale, ecritA }) => ({
  commit,
  arbreSale,
  ecritA,
});

/** Le marqueur prouve-t-il que la tête a passé `npm test` ? Il faut le même commit et un arbre
 * propre au moment du test : sinon le test a porté sur du code qui n'est pas dans le commit. */
export const marqueurFrais = (marqueur, commitTete) =>
  Boolean(marqueur?.commit) &&
  marqueur.commit === commitTete &&
  marqueur.arbreSale === false;

// --- Disque et git ---------------------------------------------------------------------------

const git = (dossier, ...args) =>
  execFileSync("git", ["-C", dossier, ...args], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();

/** L'état git du checkout qui contient `dossier`. Lève hors d'un dépôt. */
export function contexteGit(dossier) {
  const [gitDir, commonDir] = git(
    dossier,
    "rev-parse",
    "--path-format=absolute",
    "--git-dir",
    "--git-common-dir",
  )
    .split("\n")
    .map((chemin) => resolve(chemin));
  return {
    racine: resolve(git(dossier, "rev-parse", "--show-toplevel")),
    estWorktree: gitDir !== commonDir,
    // Vide en tête détachée.
    branche: git(dossier, "branch", "--show-current"),
    commitTete: git(dossier, "rev-parse", "HEAD"),
    arbreSale: git(dossier, "status", "--porcelain") !== "",
  };
}

/** Le marqueur du worktree `racine`, ou null s'il manque ou s'il est illisible. */
export function lireMarqueur(racine) {
  try {
    return JSON.parse(readFileSync(join(racine, FICHIER_MARQUEUR), "utf8"));
  } catch {
    return null;
  }
}
