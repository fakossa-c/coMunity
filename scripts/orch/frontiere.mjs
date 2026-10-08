// Calcule les tickets qui peuvent partir maintenant (spec #208, ticket #213).
//
// Usage : node scripts/orch/frontiere.mjs (--spec <n> | --tickets a,b,c | --tous) [--json]
//
// Pourquoi : l'orchestrateur calculait cette liste une fois par salve, d'après le texte des
// tickets, et se trompait quand un bloqueur se fermait en cours de route. Ici chaque appel relit le
// tracker, les PR, les worktrees, les sessions et la machine : un bloqueur fermé libère son ticket
// à l'appel suivant, sans autre action.
//
// Même architecture que lancer.mjs : `lire` (gh, git, docker, claude, disque), `decider` (pure :
// la situation lue en entrée, un verdict par ticket en sortie), `formater` (texte lisible). La
// sortie `--json` est celle de `decider`, pour la boucle.
//
// Chaque ticket est « lançable » ou porte la liste de ses raisons d'exclusion, avec le ticket, la
// PR, le worktree ou le projet Supabase en cause. Les tickets sont jugés dans l'ordre des
// numéros : de deux tickets lançables qui se recouvrent (fichiers ou migration), le plus petit
// numéro part, l'autre attend, pour que la boucle ne lance jamais les deux ensemble.
import { readFileSync } from "node:fs";
import { homedir, freemem, platform } from "node:os";
import { basename, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { parseArgs } from "node:util";
import {
  cheminsEtat,
  envGh,
  executer,
  lireEtat,
  lireValeurs,
  racineCheckoutCourant,
  racineCheckoutPrincipal,
  specDepuisCorps,
} from "./commun.mjs";

const ETIQUETTE_PRETE = "ready-for-agent";
const DOSSIER_MIGRATIONS = "supabase/migrations";
// Une session `done` ou `stopped` ne travaille plus : sa PR, si elle existe, porte ses fichiers.
const ETATS_SESSION_FINIE = ["done", "stopped"];

// --- Lecture du texte des tickets -------------------------------------------------------------

const numerosDe = (texte) =>
  [...texte.matchAll(/#(\d+)/g)].map((m) => Number(m[1]));

/** Le contenu de la section `## <titre>` d'un corps de ticket, ou null si elle manque. */
function section(corps, titre) {
  const debut = corps?.match(new RegExp(`^##\\s*${titre}\\s*$`, "im"));
  if (!debut) return null;
  const suite = corps.slice(debut.index + debut[0].length);
  const fin = suite.search(/^##\s/m);
  return fin === -1 ? suite : suite.slice(0, fin);
}

/** Les chemins (entre accents graves) de la section `## Fichiers` ; null si elle manque. */
export function fichiersDepuisCorps(corps) {
  const texte = section(corps, "Fichiers");
  if (texte === null) return null;
  return [...texte.matchAll(/`([^`\n]+)`/g)].map((m) => m[1].trim());
}

/** Les bloqueurs écrits dans le corps : la section `## Blocked by` ou une ligne `Blocked by: …`. */
export function bloqueursDepuisCorps(corps) {
  const trouves = numerosDe(section(corps, "Blocked by") ?? "");
  for (const ligne of corps?.matchAll(/^\s*Blocked by\s*:(.*)$/gim) ?? []) {
    trouves.push(...numerosDe(ligne[1]));
  }
  return [...new Set(trouves)];
}

// --- Chemins ----------------------------------------------------------------------------------

const normaliser = (chemin) =>
  chemin.replace(/\\/g, "/").replace(/^\.\//, "").replace(/\/+$/, "");

/** Deux chemins se recoupent s'ils sont identiques ou si l'un est le dossier de l'autre. Un motif
 * avec `*` se compare par ce qui précède l'étoile : prudent, il recoupe plus qu'il ne faut. */
export function recoupe(a, b) {
  const [x, y] = [normaliser(a), normaliser(b)];
  if (x.includes("*") || y.includes("*")) {
    const [px, py] = [x, y].map((c) => c.split("*")[0]);
    return px.startsWith(py) || py.startsWith(px);
  }
  return x === y || x.startsWith(`${y}/`) || y.startsWith(`${x}/`);
}

/** Les chemins de `a` qui en recoupent un de `b`. */
export const fichiersCommuns = (a, b) =>
  a.filter((chemin) => b.some((autre) => recoupe(chemin, autre)));

export const estMigration = (fichiers) =>
  fichiers.some((chemin) => recoupe(chemin, DOSSIER_MIGRATIONS));

const abreger = (fichiers) =>
  fichiers.length > 3
    ? `${fichiers.slice(0, 3).join(", ")}, …`
    : fichiers.join(", ");

// --- Sélection --------------------------------------------------------------------------------

const parNumero = (a, b) => a - b;

/** Une spec décrit son problème (format de /to-spec), ou est le parent d'autres issues. */
function estSpec(issue, issues) {
  return (
    /^##\s*Problem Statement\s*$/im.test(issue.corps ?? "") ||
    issues.some((i) => specDepuisCorps(i.corps)?.numero === issue.numero)
  );
}

/** Les numéros des tickets à juger, selon le mode : `{ type: "spec", numero }`,
 * `{ type: "tickets", numeros }` ou `{ type: "tous" }`. `sousIssues` : numéros des sous-issues
 * natives de la spec, quand GitHub les connaît. */
export function selectionner(mode, issues, { sousIssues = [] } = {}) {
  const ouvertes = issues.filter((i) => i.etat === "OPEN");
  let numeros;
  if (mode.type === "tickets") {
    numeros = mode.numeros;
  } else if (mode.type === "spec") {
    numeros = ouvertes
      .filter(
        (i) =>
          specDepuisCorps(i.corps)?.numero === mode.numero ||
          sousIssues.includes(i.numero),
      )
      .map((i) => i.numero);
  } else {
    numeros = ouvertes
      .filter(
        (i) =>
          i.etiquettes.includes(ETIQUETTE_PRETE) &&
          i.assignes.length === 0 &&
          !estSpec(i, issues),
      )
      .map((i) => i.numero);
  }
  return [...new Set(numeros)].sort(parNumero);
}

// --- Docker -----------------------------------------------------------------------------------

/** Les projets Supabase du dépôt (principal et worktrees) qui ont un conteneur de base démarré.
 * Les conteneurs s'appellent `supabase_<service>_<project_id>`. */
export function supabasesDemarres(nomsConteneurs, projet) {
  const ids = nomsConteneurs
    .map((nom) => nom.match(/^supabase_db_(.+)$/)?.[1])
    .filter((id) => id && (id === projet || id.startsWith(`${projet}-`)));
  return [...new Set(ids)];
}

// --- Décision ---------------------------------------------------------------------------------

/** Ce qui occupe déjà des fichiers : une PR ouverte, un worktree présent, un ticket en vol. */
function occupations(situation, issues) {
  const fichiersTickets = (numeros) =>
    numeros.flatMap((n) => fichiersDepuisCorps(issues.get(n)?.corps) ?? []);
  const ouvert = (n) => issues.get(n)?.etat !== "CLOSED";
  const liste = [];
  for (const pr of situation.prs) {
    liste.push({
      nature: `PR #${pr.numero} « ${pr.titre} »`,
      tickets: pr.tickets,
      fichiers: [...pr.fichiers, ...fichiersTickets(pr.tickets)],
      genre: "pr",
      numero: pr.numero,
    });
  }
  // Un ticket en vol qui a aussi son worktree ne fait qu'une occupation : même ticket, mêmes
  // fichiers, une seule ligne dans la sortie.
  const enVol = new Set(situation.enVol.map((v) => v.ticket));
  const worktrees = new Map(
    situation.worktrees
      .filter((w) => ouvert(w.ticket))
      .map((w) => [w.ticket, w.nom]),
  );
  for (const ticket of [...new Set([...enVol, ...worktrees.keys()])]) {
    if (!ouvert(ticket)) continue;
    const nom = worktrees.get(ticket);
    liste.push({
      nature: enVol.has(ticket)
        ? `ticket #${ticket} en vol${nom ? ` (worktree ${nom})` : ""}`
        : `worktree ${nom}`,
      tickets: [ticket],
      fichiers: fichiersTickets([ticket]),
      genre: enVol.has(ticket) ? "vol" : "worktree",
    });
  }
  return liste.map((o) => ({ ...o, migration: estMigration(o.fichiers) }));
}

function raisonsBloqueurs(candidat, situation, issues) {
  const natifs = situation.natifs[candidat.numero] ?? [];
  const bloqueurs =
    natifs.length > 0
      ? natifs
      : bloqueursDepuisCorps(candidat.corps).map((numero) => ({
          numero,
          etat: issues.get(numero)?.etat,
        }));
  return bloqueurs
    .filter((b) => b.etat !== "CLOSED")
    .map((b) =>
      b.etat === "OPEN"
        ? `bloqué par #${b.numero} (ouvert)`
        : `bloqué par #${b.numero} (état non lu, compté ouvert)`,
    );
}

/** Les raisons propres à un ticket : son état, ses bloqueurs, ce qui occupe ses fichiers. */
function raisonsDuTicket(candidat, situation, issues, occupees) {
  const raisons = [];
  if (candidat.etat !== "OPEN") raisons.push("ticket fermé");
  if (candidat.assignes.length > 0) {
    raisons.push(`déjà assigné à ${candidat.assignes.join(", ")}`);
  }
  raisons.push(...raisonsBloqueurs(candidat, situation, issues));

  const fichiers = fichiersDepuisCorps(candidat.corps);
  if (fichiers === null) {
    raisons.push("section ## Fichiers absente : recouvrement non vérifiable");
  }

  for (const occupation of occupees) {
    if (!occupation.tickets.includes(candidat.numero)) continue;
    raisons.push(
      occupation.genre === "pr"
        ? `${occupation.nature} déjà ouverte pour ce ticket`
        : `${occupation.nature} : ticket déjà pris`,
    );
  }
  const autres = occupees.filter((o) => !o.tickets.includes(candidat.numero));
  const migration = estMigration(fichiers ?? []);
  for (const occupation of autres) {
    const communs = fichiersCommuns(fichiers ?? [], occupation.fichiers);
    if (communs.length > 0) {
      raisons.push(`recouvre ${occupation.nature} (${abreger(communs)})`);
    }
    if (migration && occupation.migration) {
      raisons.push(`migration déjà en cours : ${occupation.nature}`);
    }
  }
  return raisons;
}

/** Les raisons de budget, communes à tous les tickets : mémoire et Supabase lourd. */
function budget(situation, valeurs) {
  const parSession = valeurs.memoireParSessionMo;
  const memoire = Math.floor(situation.memoireDisponibleMo / parSession);
  const raisons = [];
  if (memoire < 1) {
    raisons.push(
      `mémoire insuffisante : ${situation.memoireDisponibleMo} Mo libres, ${parSession} Mo par session`,
    );
  }
  let service;
  if (situation.supabases === null) {
    service = 0;
    raisons.push("Docker injoignable : Supabase lourd non vérifiable");
  } else {
    service = Math.max(
      0,
      valeurs.servicesLourdsEnParallele - situation.supabases.length,
    );
    if (service < 1) {
      raisons.push(
        `Supabase lourd déjà démarré : ${situation.supabases.join(", ")} (${valeurs.servicesLourdsEnParallele} service autorisé en parallèle)`,
      );
    }
  }
  return { memoire: Math.max(0, memoire), service, raisons };
}

/** Le verdict de chaque ticket candidat. Pure : `situation` est déjà lue, rien n'est exécuté.
 *
 *  situation = {
 *    issues       : [{ numero, titre, etat, assignes, corps }]  tout ce qui est cité plus bas
 *    candidats    : [numéro]                                    résultat de `selectionner`
 *    natifs       : { [numéro]: [{ numero, etat }] }            dépendances natives GitHub
 *    prs          : [{ numero, titre, tickets, fichiers }]      PR ouvertes
 *    worktrees    : [{ ticket, nom }]                           worktrees de tickets présents
 *    enVol        : [{ ticket, origine }]                       fichier d'état et sessions
 *    memoireDisponibleMo, supabases (projets démarrés, null si Docker injoignable) } */
export function decider(situation, valeurs) {
  const issues = new Map(situation.issues.map((i) => [i.numero, i]));
  const occupees = occupations(situation, issues);
  const { raisons: raisonsBudget, ...places } = budget(situation, valeurs);

  const retenus = []; // lançables avant budget : {numero, fichiers, migration}
  const tickets = [...new Set(situation.candidats)]
    .sort(parNumero)
    .map((numero) => {
      const candidat = issues.get(numero) ?? {
        numero,
        titre: "(ticket introuvable)",
        etat: "CLOSED",
        assignes: [],
        corps: "",
      };
      const raisons = raisonsDuTicket(candidat, situation, issues, occupees);
      if (raisons.length === 0) {
        const fichiers = fichiersDepuisCorps(candidat.corps);
        const migration = estMigration(fichiers);
        for (const premier of retenus) {
          const communs = fichiersCommuns(fichiers, premier.fichiers);
          if (communs.length > 0) {
            raisons.push(
              `recouvre le ticket #${premier.numero}, lançable avant lui (${abreger(communs)})`,
            );
          }
          if (migration && premier.migration) {
            raisons.push(
              `migration déjà prévue par le ticket #${premier.numero}, lançable avant lui`,
            );
          }
        }
        if (raisons.length === 0) retenus.push({ numero, fichiers, migration });
      }
      if (candidat.etat === "OPEN") raisons.push(...raisonsBudget);
      return {
        numero,
        titre: candidat.titre,
        lancable: raisons.length === 0,
        raisons,
      };
    });

  const lancables = tickets.filter((t) => t.lancable).map((t) => t.numero);
  const lancementsPossibles = Math.min(
    places.memoire,
    places.service,
    lancables.length,
  );
  return {
    tickets,
    lancementsPossibles,
    aLancer: lancables.slice(0, lancementsPossibles),
    budget: places,
  };
}

// --- Sortie lisible ---------------------------------------------------------------------------

const pluriel = (n, mot) => `${n} ${mot}${n > 1 ? "s" : ""}`;

/** Une ligne d'en-tête puis une ligne par ticket, dans l'ordre des numéros. */
export function formater(resultat, libelle) {
  const { lancementsPossibles, budget: places, tickets } = resultat;
  const entete = `Frontière (${libelle}) : ${pluriel(lancementsPossibles, "lancement")} possible${lancementsPossibles > 1 ? "s" : ""} (mémoire pour ${places.memoire}, service lourd pour ${places.service})`;
  if (tickets.length === 0) return `${entete}\n  Aucun ticket candidat.`;
  const lignes = tickets.map((t) =>
    t.lancable
      ? `  #${t.numero} lançable - ${t.titre}`
      : `  #${t.numero} exclu - ${t.titre} : ${t.raisons.join(" ; ")}`,
  );
  return [entete, ...lignes].join("\n");
}

// --- Lecture du monde -------------------------------------------------------------------------

const CHAMPS_ISSUE = "number,title,state,assignees,labels,body";

const issueDepuisGh = (brute) => ({
  numero: brute.number,
  titre: brute.title,
  etat: brute.state,
  assignes: brute.assignees.map((a) => a.login),
  etiquettes: brute.labels.map((l) => l.name),
  corps: brute.body ?? "",
});

const json = (texte) => JSON.parse(texte);

/** Mémoire réellement disponible : `MemAvailable` sous Linux (le cache de fichiers se libère), la
 * mémoire libre du système ailleurs. */
export function memoireDisponibleMo() {
  if (platform() === "linux") {
    const ligne = readFileSync("/proc/meminfo", "utf8").match(
      /^MemAvailable:\s+(\d+) kB/m,
    );
    if (ligne) return Math.floor(Number(ligne[1]) / 1024);
  }
  return Math.floor(freemem() / 1024 / 1024);
}

function lire({ mode, valeurs, racine, env, home }) {
  const gh = (...args) => executer("gh", args, { env });
  const avertir = (message) => console.error(`Avertissement : ${message}`);
  const issues = new Map();
  const connaitre = (brute) => {
    const issue = issueDepuisGh(brute);
    issues.set(issue.numero, issue);
  };
  const exiger = (numeros) => {
    for (const numero of numeros) {
      if (!issues.has(numero)) {
        connaitre(
          json(
            gh(
              "issue",
              "view",
              String(numero),
              "--repo",
              valeurs.depot,
              "--json",
              CHAMPS_ISSUE,
            ),
          ),
        );
      }
    }
  };

  json(
    gh(
      "issue",
      "list",
      "--repo",
      valeurs.depot,
      "--state",
      "open",
      "--limit",
      "500",
      "--json",
      CHAMPS_ISSUE,
    ),
  ).forEach(connaitre);

  let sousIssues = [];
  if (mode.type === "spec") {
    try {
      sousIssues = gh(
        "api",
        "--paginate",
        `repos/${valeurs.depot}/issues/${mode.numero}/sub_issues`,
        "--jq",
        ".[].number",
      )
        .split("\n")
        .filter(Boolean)
        .map(Number);
      exiger(sousIssues);
    } catch (erreur) {
      avertir(
        `sous-issues natives de la spec #${mode.numero} illisibles (${erreur.message.split("\n")[0]}) : lecture de la ligne Parent seule.`,
      );
    }
  }
  const candidats = selectionner(mode, [...issues.values()], { sousIssues });
  exiger(candidats);

  const natifs = {};
  for (const numero of candidats) {
    try {
      natifs[numero] = json(
        gh(
          "api",
          `repos/${valeurs.depot}/issues/${numero}/dependencies/blocked_by`,
        ),
      ).map((b) => ({ numero: b.number, etat: b.state.toUpperCase() }));
    } catch {
      // Pas de dépendances natives lisibles : la ligne « Blocked by » du corps fait foi.
    }
  }
  exiger(
    candidats.flatMap((n) =>
      natifs[n]?.length > 0 ? [] : bloqueursDepuisCorps(issues.get(n).corps),
    ),
  );

  const prs = json(
    gh(
      "pr",
      "list",
      "--repo",
      valeurs.depot,
      "--state",
      "open",
      "--limit",
      "100",
      "--json",
      "number,title,headRefName,files,closingIssuesReferences",
    ),
  ).map((pr) => ({
    numero: pr.number,
    titre: pr.title,
    tickets: [
      ...new Set([
        ...pr.closingIssuesReferences.map((r) => r.number),
        ...(pr.headRefName.match(/^ticket-(\d+)$/)
          ? [Number(pr.headRefName.slice(7))]
          : []),
      ]),
    ],
    fichiers: pr.files.map((f) => f.path),
  }));

  const worktrees = executer("git", [
    "-C",
    racine,
    "worktree",
    "list",
    "--porcelain",
  ])
    .split("\n")
    .filter((ligne) => ligne.startsWith("worktree "))
    .map((ligne) => basename(ligne.slice(9)))
    .filter((nom) => /^ticket-\d+$/.test(nom))
    .map((nom) => ({ ticket: Number(nom.slice(7)), nom }));

  const enVol = Object.keys(
    lireEtat(cheminsEtat({ home, projet: valeurs.projet }).fichier).tickets,
  ).map((ticket) => ({ ticket: Number(ticket), origine: "état" }));
  try {
    for (const s of json(executer("claude", ["agents", "--json"]))) {
      const ticket = s.name?.match(/^ticket-(\d+)$/)?.[1];
      if (ticket && !ETATS_SESSION_FINIE.includes(s.state)) {
        enVol.push({ ticket: Number(ticket), origine: "session" });
      }
    }
  } catch (erreur) {
    avertir(
      `sessions illisibles (${erreur.message.split("\n")[0]}) : seul le fichier d'état compte les tickets en vol.`,
    );
  }
  exiger([...worktrees, ...enVol].map((x) => x.ticket));
  exiger(prs.flatMap((pr) => pr.tickets));

  let supabases = null;
  try {
    supabases = supabasesDemarres(
      executer("docker", ["ps", "--format", "{{.Names}}"])
        .split("\n")
        .filter(Boolean),
      valeurs.projet,
    );
  } catch {
    // Docker injoignable : `decider` le dit, aucun lancement.
  }

  return {
    issues: [...issues.values()],
    candidats,
    natifs,
    prs,
    worktrees,
    enVol,
    memoireDisponibleMo: memoireDisponibleMo(),
    supabases,
  };
}

// --- Commande ---------------------------------------------------------------------------------

const USAGE =
  "Usage : node scripts/orch/frontiere.mjs (--spec <n> | --tickets a,b,c | --tous) [--json]";

/** Le mode choisi par les options, ou null si zéro ou plusieurs modes sont demandés. */
export function modeDepuisOptions(options) {
  const demandes = [
    options.spec,
    options.tickets,
    options.tous || undefined,
  ].filter((v) => v !== undefined);
  if (demandes.length !== 1) return null;
  if (options.tous) return { type: "tous" };
  if (options.spec !== undefined) {
    return /^#?\d+$/.test(options.spec)
      ? { type: "spec", numero: Number(options.spec.replace("#", "")) }
      : null;
  }
  const numeros = options.tickets.match(/\d+/g)?.map(Number) ?? [];
  return numeros.length > 0 ? { type: "tickets", numeros } : null;
}

const libelleMode = (mode) =>
  ({
    spec: `spec #${mode.numero}`,
    tickets: `tickets ${mode.numeros?.map((n) => `#${n}`).join(", ")}`,
    tous: "tous les tickets ready-for-agent non assignés",
  })[mode.type];

export function main(argv) {
  const { values: options } = parseArgs({
    args: argv,
    options: {
      spec: { type: "string" },
      tickets: { type: "string" },
      tous: { type: "boolean", default: false },
      json: { type: "boolean", default: false },
    },
  });
  const mode = modeDepuisOptions(options);
  if (!mode) {
    console.error(USAGE);
    return 1;
  }
  const ici = dirname(fileURLToPath(import.meta.url));
  const valeurs = lireValeurs(racineCheckoutCourant(ici));
  const situation = lire({
    mode,
    valeurs,
    racine: racineCheckoutPrincipal(ici),
    env: envGh(valeurs.compteGh),
    home: homedir(),
  });
  const resultat = decider(situation, valeurs);
  console.log(
    options.json
      ? JSON.stringify({ mode: libelleMode(mode), ...resultat }, null, 2)
      : formater(resultat, libelleMode(mode)),
  );
  return 0;
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  try {
    process.exit(main(process.argv.slice(2)));
  } catch (erreur) {
    console.error(erreur.message);
    process.exit(1);
  }
}
