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

// --- Parties de la suite -----------------------------------------------------------------------

/** Le fichier des parties vertes du commit de tête, ignoré par git comme le marqueur. */
export const FICHIER_PARTIES = ".claude/test-parties.json";

/** Les cinq parties de `npm test`, chacune sous la limite de 10 minutes d'une commande de session
 * (ticket #233). `npm test` en une fois les enchaîne ; une session les lance une à une avec
 * `npm run test:partie -- <nom>`, qui enregistre le succès de la partie. */
export const PARTIES_DE_TEST = [
  { nom: "format", commande: "npm run format:check" },
  { nom: "unitaires", commande: "npm run test:unit" },
  { nom: "base", commande: "npm run test:db" },
  { nom: "mobile", commande: "npx playwright test --project=mobile" },
  { nom: "ordinateur", commande: "npx playwright test --project=desktop" },
];

/** La commande de session qui lance une partie et enregistre son succès. */
export const commandeDeLaPartie = (nom) => `npm run test:partie -- ${nom}`;

/** L'état des parties après le succès de `nom` sur `commit` : un autre commit repart de zéro. */
export const enregistrerPartie = (etat, { nom, commit, ecritA }) => ({
  commit,
  parties: {
    ...(etat?.commit === commit ? etat.parties : {}),
    [nom]: ecritA,
  },
});

/** Les noms des parties pas encore vertes sur `commitTete`, dans l'ordre de la suite. */
export const partiesManquantes = (etat, commitTete) => {
  const vertes = etat?.commit === commitTete ? (etat.parties ?? {}) : {};
  return PARTIES_DE_TEST.map(({ nom }) => nom).filter((nom) => !vertes[nom]);
};

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

/** Les parties vertes enregistrées dans le worktree `racine`, ou null si le fichier manque. */
export function lireParties(racine) {
  try {
    return JSON.parse(readFileSync(join(racine, FICHIER_PARTIES), "utf8"));
  } catch {
    return null;
  }
}

/** Le marqueur du worktree `racine`, ou null s'il manque ou s'il est illisible. */
export function lireMarqueur(racine) {
  try {
    return JSON.parse(readFileSync(join(racine, FICHIER_MARQUEUR), "utf8"));
  } catch {
    return null;
  }
}
