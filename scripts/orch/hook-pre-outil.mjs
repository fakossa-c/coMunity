// Garde-fou avant outil d'une session de ticket (hook PreToolUse, déclaré dans
// .claude/settings.json ; spec #208, ticket #215).
//
// Pourquoi : une commande lancée en arrière-plan puis attendue a coincé des sessions des dizaines
// de minutes, et une session qui termine son tour avec une commande de fond en cours perd son
// travail. Hors d'un worktree de ticket, tout passe.
//
// Entrée : le JSON du hook sur stdin. Sortie : code 2 et raison sur stderr pour bloquer, 0 sinon.
import { readFileSync } from "node:fs";
import { contexteGit, ticketDuWorktree } from "./session-ticket.mjs";

const OUTILS_SHELL = new Set(["Bash", "PowerShell"]);
const OUTILS_D_ATTENTE = new Set(["Monitor", "TaskOutput"]);

const CONSIGNE =
  "Lance la commande au premier plan et attends sa fin ; une commande longue se découpe, ou se lance avec un délai plus long (`timeout`).";

// Un `&` seul détache la commande. Ni `&&`, ni `>&` (2>&1), ni `&>`, ni `|&`.
const ESPERLUETTE_SEULE = /(?<![&>|])&(?![&>])/;

/** La commande avec le contenu de ses guillemets vidé : un `&` dans une URL entre guillemets ne
 * détache rien. */
const sansGuillemets = (commande) =>
  commande.replace(/"(?:\\.|[^"\\])*"|'[^']*'/g, '""');

// Les commandes qui détachent un processus du shell, sans `&`.
const DETACHEUR = /(?<![\w-])(?:nohup|setsid|disown)(?![\w-])/;

/** La raison du refus, ou null si l'outil peut passer. `ticket` est le numéro du ticket de la
 * session, ou null hors d'un worktree de ticket. */
export function verdict({ ticket, outil, entree }) {
  if (ticket === null) return null;
  if (OUTILS_D_ATTENTE.has(outil)) {
    return `Outil d'attente refusé dans une session de ticket (#${ticket}) : attendre un processus de fond a coincé des sessions des dizaines de minutes. ${CONSIGNE}`;
  }
  if (!OUTILS_SHELL.has(outil)) return null;
  const commande = sansGuillemets(entree?.command ?? "");
  const detache =
    entree?.run_in_background === true ||
    ESPERLUETTE_SEULE.test(commande) ||
    DETACHEUR.test(commande);
  if (detache) {
    return `Commande lancée en arrière-plan refusée dans une session de ticket (#${ticket}) : une commande de fond encore en cours en fin de tour fait perdre le travail, et l'attendre coince la session. ${CONSIGNE}`;
  }
  return null;
}

if (process.argv[1]?.endsWith("hook-pre-outil.mjs")) {
  let raison;
  try {
    const entree = JSON.parse(readFileSync(0, "utf8"));
    const { racine, estWorktree } = contexteGit(entree.cwd);
    raison = verdict({
      ticket: ticketDuWorktree({ estWorktree, racine }),
      outil: entree.tool_name,
      entree: entree.tool_input,
    });
  } catch {
    process.exit(0); // hors dépôt ou entrée illisible : rien à garder
  }
  if (raison) {
    console.error(raison);
    process.exit(2);
  }
}
