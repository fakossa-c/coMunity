// Lance la session de fond d'un ticket, prête à travailler, en une commande (spec #208, ticket #210).
//
// Usage : node scripts/orch/lancer.mjs <numéro> [--dry-run] [--en-parallele 205,207]
//                                      [--orchestrateur <nom>]
//
// Pourquoi : l'orchestrateur enchaînait ces étapes à la main et c'est là qu'il se trompait (prompt
// cassé par une apostrophe, identifiant de session perdu, `cd` qui le déplace). Ici le prompt passe
// par un fichier, l'identifiant est écrit dans l'état avant toute autre action, et aucune étape ne
// dépend du dossier courant.
//
// Il démarre le Supabase du worktree : l'appeler quand le service lourd est libre (le budget
// mémoire et le « un seul Supabase à la fois » reviennent à la frontière et à la boucle).
//
// Trois couches : `lire` (gh, git, disque), `decider` (pure : la situation lue en entrée, la liste
// des actions en sortie, ou les raisons du refus), `executer`/`decrire` (faire, ou afficher avec
// --dry-run). Fonctionne pareil en bash et en PowerShell : aucun heredoc, chemins par node:path.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { parseArgs } from "node:util";
import {
  ajouterSession,
  cheminsEtat,
  ecrireJson,
  envGh,
  executer,
  executerCommande,
  idDepuisSortieBg,
  lireEtat,
  lireValeurs,
  racineCheckoutCourant,
  racineCheckoutPrincipal,
} from "./commun.mjs";

export const brancheTicket = (numero) => `ticket-${numero}`;

export const dossierWorktree = (racine, valeurs, numero) =>
  join(racine, valeurs.dossierWorktrees, brancheTicket(numero));

export const cheminModelePrompt = (home) =>
  join(home, ".claude", "skills", "orchestrer-tickets", "PROMPT-SESSION.md");

const lienIssue = (valeurs, numero) =>
  `https://github.com/${valeurs.depot}/issues/${numero}`;

// --- Prompt -----------------------------------------------------------------------------------

const MOTIF_VARIABLE = String.raw`\{\{(\w+)\}\}`;
const echapper = (texte) => texte.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Le gabarit PROMPT-SESSION.md du skill est encore écrit avec des `<…>` à remplir à la main. Cette
// table les remplit, pour que le lancement serve avant sa réécriture en `{{variable}}` (spec #208,
// étape 7) : retirer la table avec ce format.
function ancienFormat(v) {
  return new Map([
    [
      "2. Gate étape 3 : t'assigner le ticket, puis dans ce dossier : installer les dépendances, <procédure d'isolation Docker du projet>, <démarrer le service si feu vert>.",
      "2. Gate étape 3 : faite par le lancement (ticket assigné et « In Progress », dépendances installées, Supabase isolé, démarré et variables locales écrites) : ne rien refaire.",
    ],
    [
      "<« feu vert pour ton service dès maintenant » | « un seul service à la fois et il est pris : fais d'abord tout ce qui n'en a pas besoin, puis envoie « #<n> : besoin du service » et attends la réponse »>",
      "feu vert pour ton service : le lancement l'a déjà démarré, ne le relance pas",
    ],
    [
      "<commande de lien de preview du projet, par exemple `vercel link --yes --project <projet>`>",
      `\`${v.commandeLienPreview}\``,
    ],
    [
      "<procédure d'isolation Docker du projet>",
      "constater que le lancement a déjà isolé Supabase et installé les dépendances, sans rien refaire",
    ],
    [
      "<démarrer le service si feu vert>",
      "constater que le service est déjà démarré",
    ],
    ["<commande de migration distante>", `\`${v.commandeMigration}\``],
    ["<commande du tracker>", `gh issue view ${v.ticket}`],
    ["<commande stop>", v.commandeArret],
    ["<nom de l'orchestrateur>", v.orchestrateur],
    ["<orchestrateur>", v.orchestrateur],
    ["<liste ou « aucun »>", v.enParallele],
    ["<branche d'intégration>", v.brancheIntegration],
    ["<fichiers>", "ceux de la section `## Fichiers` de leurs tickets"],
    ["<dossier>", v.dossier],
    // Le titre de l'issue que la session ouvre, pas celui du ticket.
    ["issue #m ouverte : <titre>", "issue #m ouverte : « titre de l'issue »"],
    ["<titre>", v.titre],
    ["<nom>", v.depot],
    ["<n>", String(v.ticket)],
    ["CONTEXT.md", v.glossaire],
  ]);
}

/** Le prompt de la session : le premier bloc ``` du gabarit (ou le gabarit entier), variables
 * `{{nom}}` remplacées. Une variable inconnue lève une erreur : un prompt à trous ne part pas. */
export function construirePrompt(modele, variables) {
  const bloc = modele.match(/```[^\n]*\n([\s\S]*?)\n```/)?.[1] ?? modele;
  const ancien = ancienFormat(variables);
  const cles = [...ancien.keys()]
    .sort((a, b) => b.length - a.length)
    .map(echapper);
  const motif = new RegExp([MOTIF_VARIABLE, ...cles].join("|"), "g");
  let ancienUtilise = false;
  // Une seule passe, et une fonction de remplacement : la valeur insérée n'est jamais relue
  // (un titre qui contient `<n>` ou `$&` reste tel quel).
  let prompt = bloc.replace(motif, (trouve, nom) => {
    if (nom === undefined) {
      ancienUtilise = true;
      return ancien.get(trouve);
    }
    if (!(nom in variables)) {
      throw new Error(`Variable inconnue dans PROMPT-SESSION.md : {{${nom}}}`);
    }
    return String(variables[nom]);
  });
  // Un gabarit à l'ancien format garde un `<…>` qu'aucune valeur ne remplit : le prompt ne part pas.
  const trou = ancienUtilise && prompt.match(/<[^<>\n]+>/)?.[0];
  if (trou)
    throw new Error(
      `Gabarit PROMPT-SESSION.md : ${trou} n'est rempli par aucune valeur`,
    );
  // L'ancien gabarit n'a pas de place pour la spec : elle ferme le prompt plutôt que de manquer.
  if (
    variables.specNumero !== "aucune" &&
    !prompt.includes(variables.specLien)
  ) {
    prompt += `\n\nSpec parente : spec #${variables.specNumero}, ${variables.specLien}.`;
  }
  return prompt;
}

// --- Décision ---------------------------------------------------------------------------------

/** Ce qu'il faut faire pour lancer le ticket, ou pourquoi on refuse. Pure : `situation` est déjà
 * lue (ticket, checkout principal, worktrees, gabarit du prompt) et rien n'est exécuté ici. */
export function decider(situation, valeurs) {
  const { ticket, racine, home } = situation;
  const numero = ticket.numero;
  const branche = brancheTicket(numero);
  const dossier = dossierWorktree(racine, valeurs, numero);

  const refus = [];
  if (ticket.etat !== "OPEN") refus.push(`Le ticket #${numero} est fermé.`);
  if (ticket.assignes.length > 0) {
    refus.push(
      `Le ticket #${numero} est déjà assigné à ${ticket.assignes.join(", ")}.`,
    );
  }
  if (situation.arbreSale) {
    refus.push(
      "Le checkout principal a des modifications non commitées : les commiter ou les écarter avant de lancer.",
    );
  }
  if (situation.worktreeExiste) {
    refus.push(`Le worktree ${dossier} existe déjà.`);
  }
  if (situation.brancheExiste) {
    refus.push(`La branche ${branche} existe déjà.`);
  }
  if (refus.length > 0) return { refus, actions: [] };

  const chemins = cheminsEtat({ home, projet: valeurs.projet });
  const fichierPrompt = join(chemins.prompts, `${branche}.md`);
  const parallele = situation.enParallele.map((n) => `#${n}`).join(", ");
  const contenu = construirePrompt(situation.modelePrompt, {
    ticket: numero,
    titre: ticket.titre,
    depot: valeurs.depot.split("/").at(-1),
    specNumero: situation.spec?.numero ?? "aucune",
    specLien: situation.spec
      ? lienIssue(valeurs, situation.spec.numero)
      : "aucun",
    glossaire: valeurs.glossaire,
    enParallele: parallele || "aucun",
    orchestrateur: situation.orchestrateur,
    dossier,
    brancheTicket: branche,
    brancheIntegration: valeurs.brancheIntegration,
    commandeArret: valeurs.commandes.arret,
    commandeMigration: valeurs.commandes.migrationDistante,
    commandeLienPreview: valeurs.commandes.lienPreview,
    compteGh: valeurs.compteGh,
  });

  const { commandes } = valeurs;
  return {
    refus: [],
    actions: [
      { type: "assigner", ticket: numero, compte: valeurs.compteGh },
      { type: "statut", ticket: numero, statut: "In Progress" },
      { type: "recuperer", branche: valeurs.brancheIntegration },
      {
        type: "creerWorktree",
        dossier,
        branche,
        base: `origin/${valeurs.brancheIntegration}`,
      },
      { type: "isoler", commande: commandes.isolation, dossier },
      { type: "installer", commande: commandes.installation, dossier },
      { type: "demarrerService", commande: commandes.demarrage, dossier },
      {
        type: "variablesLocales",
        commande: commandes.variablesLocales,
        dossier,
      },
      { type: "ecrirePrompt", fichier: fichierPrompt, contenu },
      {
        type: "lancerSession",
        nom: branche,
        modele: valeurs.modeleSession,
        modePermission: "auto",
        sansMcp: true,
        dossier,
        fichierPrompt,
        instruction: `Ton prompt de session est dans le fichier ${fichierPrompt} : lis-le en entier avec l'outil Read, puis suis-le à la lettre.`,
      },
      {
        type: "enregistrerSession",
        ticket: numero,
        nom: branche,
        fichierEtat: chemins.fichier,
      },
      { type: "verifierSession", nom: branche },
    ],
  };
}

/** Une ligne par action, pour --dry-run et le suivi de l'exécution. */
export function decrire(action) {
  switch (action.type) {
    case "assigner":
      return `Assigner le ticket #${action.ticket} à ${action.compte}`;
    case "statut":
      return `Passer le ticket #${action.ticket} « ${action.statut} » sur le tableau`;
    case "recuperer":
      return `Récupérer ${action.branche} distant (git fetch origin ${action.branche})`;
    case "creerWorktree":
      return `Créer le worktree ${action.dossier} sur la branche ${action.branche}, depuis ${action.base}`;
    case "isoler":
      return `Isoler le Supabase du worktree : ${action.commande}`;
    case "installer":
      return `Installer les dépendances dans le worktree : ${action.commande}`;
    case "demarrerService":
      return `Démarrer le service lourd : ${action.commande}`;
    case "variablesLocales":
      return `Écrire les variables locales : ${action.commande}`;
    case "ecrirePrompt":
      return `Écrire le prompt de la session dans ${action.fichier} (${action.contenu.split("\n").length} lignes)`;
    case "lancerSession":
      return `Lancer la session de fond ${action.nom} (modèle ${action.modele}, mode ${action.modePermission}, sans serveur MCP) dans ${action.dossier}`;
    case "enregistrerSession":
      return `Enregistrer l'identifiant de la session ${action.nom} dans ${action.fichierEtat}`;
    case "verifierSession":
      return `Vérifier la session ${action.nom} dans le listage JSON (claude agents --json)`;
    default:
      throw new Error(`Action inconnue : ${action.type}`);
  }
}

// --- Lecture ----------------------------------------------------------------------------------

/** Le numéro de la spec, lu dans la section « ## Parent » du ticket (format de /to-tickets). */
export function specDepuisCorps(corps) {
  const numero = corps?.match(/^##\s*Parent\s*\n+\s*(?:Spec\s*)?#(\d+)/im)?.[1];
  return numero ? { numero: Number(numero) } : null;
}

/** « 205,207 » ou « #205 #207 » → [205, 207]. */
export function numerosDepuisOption(texte) {
  return (texte?.match(/\d+/g) ?? []).map(Number);
}

const sansAntislash = (chemin) => chemin.replace(/\\/g, "/");

/** Git liste les worktrees avec des `/` même sous Windows, où `path.join` écrit des `\\`. */
export function worktreeEnregistre(sortiePorcelain, dossier) {
  const cible = sansAntislash(dossier);
  return sortiePorcelain
    .split("\n")
    .some((ligne) => ligne === `worktree ${cible}`);
}

function lire({ numero, options, racine, valeurs, env, home }) {
  const git = (...args) => executer("git", ["-C", racine, ...args]);
  const issue = JSON.parse(
    executer(
      "gh",
      [
        "issue",
        "view",
        String(numero),
        "--repo",
        valeurs.depot,
        "--json",
        "number,title,state,assignees,body",
      ],
      { env },
    ),
  );
  const dossier = dossierWorktree(racine, valeurs, numero);
  const branche = brancheTicket(numero);
  const brancheExiste = (() => {
    try {
      git("show-ref", "--verify", "--quiet", `refs/heads/${branche}`);
      return true;
    } catch {
      return false;
    }
  })();
  const worktrees = git("worktree", "list", "--porcelain");
  return {
    ticket: {
      numero: issue.number,
      titre: issue.title,
      etat: issue.state,
      assignes: issue.assignees.map((a) => a.login),
    },
    spec: specDepuisCorps(issue.body),
    arbreSale: git("status", "--porcelain").trim() !== "",
    worktreeExiste:
      existsSync(dossier) || worktreeEnregistre(worktrees, dossier),
    brancheExiste,
    enParallele: numerosDepuisOption(options["en-parallele"]),
    orchestrateur: options.orchestrateur ?? `orch-${valeurs.projet}`,
    racine,
    home,
    modelePrompt: readFileSync(cheminModelePrompt(home), "utf8"),
  };
}

// --- Exécution --------------------------------------------------------------------------------

const attendre = (ms) => new Promise((fin) => setTimeout(fin, ms));

async function verifierSession(nom, idSession) {
  for (let essai = 0; essai < 5; essai++) {
    const sessions = JSON.parse(
      executer("claude", ["agents", "--json", "--all"]),
    );
    if (sessions.some((s) => s.id === idSession && s.name === nom)) return;
    await attendre(1000);
  }
  throw new Error(
    `La session ${nom} (${idSession}) n'apparaît pas dans « claude agents --json » : son identifiant reste dans l'état, à vérifier avec « claude agents ».`,
  );
}

export async function executerAction(action, { racine, sources, env, suivi }) {
  switch (action.type) {
    case "assigner":
      executer(
        "gh",
        [
          "issue",
          "edit",
          String(action.ticket),
          "--add-assignee",
          action.compte,
        ],
        { env },
      );
      return;
    case "statut":
      executer(
        "node",
        [
          join(sources, "scripts", "statut-ticket.mjs"),
          String(action.ticket),
          action.statut,
        ],
        { env },
      );
      return;
    case "recuperer":
      executer("git", ["-C", racine, "fetch", "origin", action.branche]);
      return;
    case "creerWorktree":
      executer("git", [
        "-C",
        racine,
        "worktree",
        "add",
        "--no-track",
        "-b",
        action.branche,
        action.dossier,
        action.base,
      ]);
      return;
    case "isoler":
    case "installer":
    case "demarrerService":
    case "variablesLocales":
      executerCommande(action.commande, { cwd: action.dossier });
      return;
    case "ecrirePrompt":
      mkdirSync(dirname(action.fichier), { recursive: true });
      writeFileSync(action.fichier, `${action.contenu}\n`);
      return;
    case "lancerSession": {
      // Le prompt est le dernier argument, après un drapeau sans valeur : `--add-dir` en prend
      // plusieurs et avalerait la consigne.
      const sortie = executer(
        "claude",
        [
          "--bg",
          "-n",
          action.nom,
          "--permission-mode",
          action.modePermission,
          "--model",
          action.modele,
          "--add-dir",
          dirname(action.fichierPrompt),
          ...(action.sansMcp ? ["--strict-mcp-config"] : []),
          action.instruction,
        ],
        { cwd: action.dossier },
      );
      suivi.idSession = idDepuisSortieBg(sortie);
      suivi.demarreA = new Date().toISOString();
      return;
    }
    case "enregistrerSession": {
      const etat = ajouterSession(lireEtat(action.fichierEtat), action.ticket, {
        id: suivi.idSession,
        nom: action.nom,
        demarreA: suivi.demarreA,
      });
      ecrireJson(action.fichierEtat, etat);
      return;
    }
    case "verifierSession":
      await verifierSession(action.nom, suivi.idSession);
      return;
    default:
      throw new Error(`Action inconnue : ${action.type}`);
  }
}

const USAGE =
  "Usage : node scripts/orch/lancer.mjs <numéro> [--dry-run] [--en-parallele 205,207] [--orchestrateur <nom>]";

export async function main(argv) {
  const { values: options, positionals } = parseArgs({
    args: argv,
    allowPositionals: true,
    options: {
      "dry-run": { type: "boolean", default: false },
      "en-parallele": { type: "string" },
      orchestrateur: { type: "string" },
    },
  });
  if (!/^\d+$/.test(positionals[0] ?? "")) {
    console.error(USAGE);
    return 1;
  }
  const numero = Number(positionals[0]);
  const ici = dirname(fileURLToPath(import.meta.url));
  // Le code et les valeurs sont ceux du checkout où le script se trouve ; les worktrees, eux, se
  // créent toujours depuis le checkout principal.
  const sources = racineCheckoutCourant(ici);
  const racine = racineCheckoutPrincipal(ici);
  const valeurs = lireValeurs(sources);
  const env = envGh(valeurs.compteGh);
  const home = homedir();

  const situation = lire({ numero, options, racine, valeurs, env, home });
  const { refus, actions } = decider(situation, valeurs);
  if (refus.length > 0) {
    for (const raison of refus) console.error(`Refus : ${raison}`);
    return 1;
  }

  if (options["dry-run"]) {
    console.log(
      `Mode répétition (--dry-run) : le ticket #${numero} ferait, sans rien modifier :`,
    );
    actions.forEach((a, i) => console.log(`  ${i + 1}. ${decrire(a)}`));
    return 0;
  }

  const suivi = {};
  for (const [i, action] of actions.entries()) {
    console.log(`${i + 1}/${actions.length} ${decrire(action)}`);
    try {
      await executerAction(action, { racine, sources, env, suivi });
    } catch (erreur) {
      console.error(
        `\nÉchec à l'étape ${i + 1} (${action.type}) : ${erreur.message}`,
      );
      console.error(
        `${suivi.idSession ? `Session déjà lancée : ${suivi.idSession} (claude attach ${suivi.idSession}). ` : ""}Étapes faites : ${
          actions
            .slice(0, i)
            .map((a) => a.type)
            .join(", ") || "aucune"
        }. Le ticket est déjà pris dès l'étape 1 : reprendre à la main à partir de cette étape.`,
      );
      return 1;
    }
  }
  console.log(
    `\nSession ${actions.at(-1).nom} lancée (${suivi.idSession}) : claude attach ${suivi.idSession}`,
  );
  return 0;
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  main(process.argv.slice(2)).then(
    (code) => process.exit(code),
    (erreur) => {
      console.error(erreur.message);
      process.exit(1);
    },
  );
}
