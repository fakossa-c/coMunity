// Garde-fou de fin de tour d'une session de ticket (hook Stop, déclaré dans .claude/settings.json ;
// spec #208, ticket #215).
//
// Pourquoi : un ticket ne doit pas être déclaré fini sans l'être (tests rouges, arbre sale, travail
// sur develop, pas de PR). La session peut rendre la main si elle a posé une question (`needs-info`)
// ou déclaré un blocage (`ready-for-human`) sur son ticket. Hors d'un worktree de ticket, tout passe.
//
// Entrée : le JSON du hook sur stdin. Sortie : code 2 et raison sur stderr pour refuser la fin du
// tour, 0 sinon.
import { readFileSync } from "node:fs";
import { envGh, executer, lireValeurs } from "./commun.mjs";
import {
  commandeDeLaPartie,
  contexteGit,
  lireMarqueur,
  lireParties,
  marqueurFrais,
  partiesManquantes,
  ticketDuWorktree,
} from "./session-ticket.mjs";

const LABELS_DE_SORTIE = ["needs-info", "ready-for-human"];
const BRANCHE_D_INTEGRATION = "develop";

const court = (commit) => commit.slice(0, 7);

/** La raison du refus, ou null si la session peut rendre la main. Pure : tout est déjà lu.
 * `labels` et `pr` valent null quand GitHub n'a pas pu être lu. */
export function verdict({
  ticket,
  hookDejaBloque,
  labels,
  branche,
  arbreSale,
  pr,
  commitTete,
  marqueur,
  parties,
}) {
  if (ticket === null) return null;
  // Plafond de Claude Code : après un refus de ce hook, le tour suivant doit pouvoir se terminer.
  if (hookDejaBloque) return null;
  if (labels?.some((label) => LABELS_DE_SORTIE.includes(label))) return null;

  const manques = [];
  if (branche === BRANCHE_D_INTEGRATION) {
    manques.push(
      `la branche est ${BRANCHE_D_INTEGRATION} : le travail d'un ticket se fait sur sa branche ticket-${ticket}`,
    );
  }
  if (pr === null) {
    manques.push(
      "GitHub est illisible : impossible de savoir si une PR est ouverte",
    );
  } else if (!pr) {
    manques.push(`aucune PR ouverte pour la branche ${branche || "(aucune)"}`);
  }
  if (arbreSale) {
    manques.push("l'arbre git a des modifications non commitées");
  }
  // Chaque partie dure moins de 10 minutes : une session les lance une à une, l'enregistrement de
  // la cinquième écrit le marqueur.
  const aLancer = () =>
    partiesManquantes(parties, commitTete).map(
      (nom) => `  \`${commandeDeLaPartie(nom)}\``,
    );
  if (!marqueur || !marqueurFrais(marqueur, commitTete)) {
    if (marqueur?.arbreSale === true && marqueur.commit === commitTete) {
      manques.push(
        "le dernier `npm test` vert a tourné sur des modifications non commitées : commite, puis relance les parties",
      );
    } else {
      manques.push(
        `les tests ne sont pas tous verts sur le commit ${court(commitTete)} ; lance chaque partie qui manque, l'une après l'autre (moins de 10 minutes chacune) :\n${aLancer().join("\n")}`,
      );
    }
  }
  if (manques.length === 0) return null;

  return [
    `Fin de tour refusée (ticket #${ticket}). Il manque :`,
    ...manques.map((manque) => `- ${manque}`),
    "Pour rendre la main sans PR : une question, c'est un commentaire sur le ticket et le label `needs-info` ; un blocage, un commentaire qui explique et le label `ready-for-human`.",
  ].join("\n");
}

// --- Lecture de GitHub -----------------------------------------------------------------------

/** Les labels du ticket et l'existence d'une PR ouverte pour la branche ; null pour ce que GitHub
 * n'a pas pu dire (réseau, jeton). */
function lireGithub({ racine, ticket, branche }) {
  const valeurs = lireValeurs(racine);
  const env = envGh(valeurs.compteGh);
  const gh = (...args) =>
    JSON.parse(executer("gh", [...args, "--repo", valeurs.depot], { env }));
  const essayer = (lecture) => {
    try {
      return lecture();
    } catch {
      return null;
    }
  };
  return {
    labels: essayer(() =>
      gh("issue", "view", String(ticket), "--json", "labels").labels.map(
        (label) => label.name,
      ),
    ),
    pr: branche
      ? essayer(
          () =>
            gh(
              "pr",
              "list",
              "--head",
              branche,
              "--state",
              "open",
              "--json",
              "number",
            ).length > 0,
        )
      : false,
  };
}

if (process.argv[1]?.endsWith("hook-fin-de-tour.mjs")) {
  let raison;
  try {
    const entree = JSON.parse(readFileSync(0, "utf8"));
    const git = contexteGit(entree.cwd);
    const ticket = ticketDuWorktree(git);
    const hookDejaBloque = entree.stop_hook_active === true;
    // Hors worktree de ticket ou après un refus : le verdict est connu sans lire GitHub.
    if (ticket === null || hookDejaBloque) process.exit(0);
    raison = verdict({
      ticket,
      hookDejaBloque,
      ...lireGithub({ racine: git.racine, ticket, branche: git.branche }),
      branche: git.branche,
      arbreSale: git.arbreSale,
      commitTete: git.commitTete,
      marqueur: lireMarqueur(git.racine),
      parties: lireParties(git.racine),
    });
  } catch {
    process.exit(0); // hors dépôt ou entrée illisible : rien à garder
  }
  if (raison) {
    console.error(raison);
    process.exit(2);
  }
}
