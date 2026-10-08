// Module commun des scripts d'orchestration (spec #208) : lecture des valeurs, fichier d'état,
// exécution de commandes, jeton `gh`.
//
// Architecture posée par le ticket #210 : chaque script d'orchestration exporte une fonction de
// décision pure, qui reçoit la situation déjà lue et rend la liste des actions ; sa couche CLI lit
// (gh, git, claude), décide, puis exécute ou, avec --dry-run, affiche. Ce module porte ce que les
// couches CLI ont en commun. Les fonctions pures sont testées ; celles qui touchent le disque ou
// lancent un processus restent minces.
//
// Valeurs : `.claude/orchestration.json` (versionné, valable pour les deux machines) et
// `.claude/orchestration.local.json` (ignoré par git, propre à la machine). Sans shell : git, gh et
// claude sont lancés par execFile ; seules les commandes du fichier de valeurs passent par le
// shell de la machine (`npx` est un .cmd sous Windows).
import { execFileSync, execSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";

const VALEURS_DU_PROJET = [
  "projet",
  "depot",
  "compteGh",
  "brancheIntegration",
  "dossierWorktrees",
  "glossaire",
  "modeleSession",
  "controleCi",
  "dureeMaxSessionMinutes",
  "delaiInactiviteMinutes",
  "reprisesMax",
];
const COMMANDES_DU_PROJET = [
  "isolation",
  "installation",
  "demarrage",
  "variablesLocales",
  "arret",
  "migrationDistante",
  "lienPreview",
];
// Une machine sans fichier local reste utilisable : un seul service lourd, mémoire prudente.
const VALEURS_DE_MACHINE = {
  memoireParSessionMo: 2048,
  servicesLourdsEnParallele: 1,
};

/** Les valeurs du projet complétées par celles de la machine. `local` est le contenu du fichier
 * local (ou null) : il ne fournit que les valeurs de machine, jamais celles du projet. */
export function fusionnerValeurs(projet, local) {
  for (const cle of VALEURS_DU_PROJET) {
    if (projet?.[cle] === undefined) {
      throw new Error(
        `Valeur manquante dans .claude/orchestration.json : ${cle}`,
      );
    }
  }
  for (const cle of COMMANDES_DU_PROJET) {
    if (projet.commandes?.[cle] === undefined) {
      throw new Error(
        `Valeur manquante dans .claude/orchestration.json : commandes.${cle}`,
      );
    }
  }
  const machine = { ...VALEURS_DE_MACHINE };
  for (const cle of Object.keys(VALEURS_DE_MACHINE)) {
    if (local?.[cle] !== undefined) machine[cle] = local[cle];
  }
  return { ...projet, ...machine };
}

/** Le dossier d'état du projet, dans la config globale : l'état n'est jamais dans le dépôt. */
export function cheminsEtat({ home = homedir(), projet }) {
  const dossier = join(home, ".claude", "state", "orch", projet);
  return {
    dossier,
    fichier: join(dossier, "etat.json"),
    prompts: join(dossier, "prompts"),
  };
}

export const etatVide = () => ({ version: 1, tickets: {} });

/** Un nouvel état où `ticket` pointe sur sa session ; l'état reçu n'est pas modifié. */
export function ajouterSession(etat, ticket, { id, nom, demarreA }) {
  return {
    ...etat,
    tickets: {
      ...etat.tickets,
      [String(ticket)]: { session: id, nom, demarreA, reprises: 0 },
    },
  };
}

const SEQUENCES_ANSI = /\u001b\[[0-9;]*m/g;

/** L'identifiant de session que `claude --bg` affiche (« backgrounded · <id> · <nom> »). La
 * commande rend 0 même quand elle refuse (dossier non approuvé) : seule la ligne fait foi. */
export function idDepuisSortieBg(sortie) {
  const texte = sortie.replace(SEQUENCES_ANSI, "");
  const id = texte.match(/backgrounded\s*·\s*([0-9a-f]{8})\b/)?.[1];
  if (!id) {
    throw new Error(
      `Aucune session lancée, sortie de claude : ${texte.trim() || "(vide)"}`,
    );
  }
  return id;
}

// --- Disque et processus ---------------------------------------------------------------

export function lireJson(fichier) {
  return existsSync(fichier) ? JSON.parse(readFileSync(fichier, "utf8")) : null;
}

/** Écriture atomique : un lecteur ne voit jamais un fichier d'état à moitié écrit. */
export function ecrireJson(fichier, contenu) {
  mkdirSync(dirname(fichier), { recursive: true });
  const temporaire = `${fichier}.tmp`;
  writeFileSync(temporaire, `${JSON.stringify(contenu, null, 2)}\n`);
  renameSync(temporaire, fichier);
}

export const lireEtat = (fichier) => lireJson(fichier) ?? etatVide();

/** La racine du checkout principal, même quand le script tourne depuis un worktree. */
export function racineCheckoutPrincipal(depuis) {
  const commun = execFileSync(
    "git",
    ["-C", depuis, "rev-parse", "--path-format=absolute", "--git-common-dir"],
    { encoding: "utf8" },
  ).trim();
  return dirname(resolve(commun));
}

/** La racine du checkout (principal ou worktree) qui contient `depuis`. */
export function racineCheckoutCourant(depuis) {
  return resolve(
    execFileSync("git", ["-C", depuis, "rev-parse", "--show-toplevel"], {
      encoding: "utf8",
    }).trim(),
  );
}

/** Les valeurs du checkout `racine` : le fichier versionné suit la branche de ce checkout. */
export function lireValeurs(racine) {
  const projet = lireJson(join(racine, ".claude", "orchestration.json"));
  if (!projet) {
    throw new Error(`.claude/orchestration.json introuvable dans ${racine}`);
  }
  return fusionnerValeurs(
    projet,
    lireJson(join(racine, ".claude", "orchestration.local.json")),
  );
}

/** L'environnement des commandes `gh` : le dépôt appartient à un compte que `gh` n'a pas toujours
 * d'actif (voir « Compte GitHub » du CLAUDE.md). */
export function envGh(compte) {
  const env = { ...process.env };
  if (!env.GH_TOKEN) {
    env.GH_TOKEN = execFileSync("gh", ["auth", "token", "-u", compte], {
      encoding: "utf8",
    }).trim();
  }
  return env;
}

/** Lance un programme sans shell et rend sa sortie standard. */
export function executer(programme, args, { cwd, env } = {}) {
  return execFileSync(programme, args, {
    cwd,
    env,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
}

/** Lance une commande du fichier de valeurs, par le shell de la machine, en laissant sa sortie à
 * l'écran. */
export function executerCommande(ligne, { cwd, env } = {}) {
  execSync(ligne, { cwd, env, stdio: "inherit" });
}
