// Dit si la PR d'un ticket est fusionnable, et sinon pourquoi (spec #208, ticket #211).
//
// Usage : node scripts/orch/verifier-pr.mjs <numéro de ticket> [--json]
// Code de sortie : 0 si la PR est fusionnable, 1 sinon (y compris quand la lecture échoue).
//
// Pourquoi : l'orchestrateur relisait chaque PR à la main avant de fusionner. La clôture (#212) et
// la boucle (#216) appellent cette commande avant toute fusion : elle relit tout à l'instant (PR,
// labels du ticket et de la PR, contrôles du commit de tête), jamais depuis un état gardé.
//
// Même architecture que lancer.mjs et frontiere.mjs : `lire` (gh), `decider` (pure : la situation
// lue en entrée, un verdict par point en sortie), `formater` (texte lisible). La sortie `--json`
// est le verdict de `decider` : `fusionnable`, `pr`, `tete` (le commit à passer à
// `gh pr merge --match-head-commit`), `points` et `raisons`.
//
// Les points, dans l'ordre : pr (une seule PR ouverte pour la branche `ticket-<n>`), base, titre
// (il cite `#<n>`), closes (« Closes #<n> » vers ce ticket et lui seul), migration (label si et
// seulement si des fichiers de supabase/migrations changent), ci (contrôle du fichier de valeurs
// réussi sur le commit de tête exact), labels (`needs-info` ou `ready-for-human` sur le ticket ou
// la PR), conflit (état « mergeable » de GitHub).
import { dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { parseArgs } from "node:util";
import {
  envGh,
  estMigration,
  executer,
  lireValeurs,
  racineCheckoutCourant,
} from "./commun.mjs";
import { brancheTicket } from "./lancer.mjs";

const ETIQUETTE_MIGRATION = "migration";
const ETIQUETTES_BLOQUANTES = ["needs-info", "ready-for-human"];
const COMMITS_ANTERIEURS_LUS = 10;
const LECTURES_FUSION = 6;
const ATTENTE_FUSION_MS = 2000;

// --- Lecture du texte de la PR ----------------------------------------------------------------

/** Le titre cite le ticket : `#<n>` entier (pas `#2110` pour le ticket 211, pas `depot#211`). */
export const titreCiteLeTicket = (titre, ticket) =>
  new RegExp(`(?<![\\w/])#${ticket}(?!\\d)`).test(titre ?? "");

const MOTS_DE_FERMETURE = String.raw`\b(?:close[sd]?|fix(?:e[sd])?|resolve[sd]?)\b:?\s*#(\d+)`;

/** Les tickets que le corps d'une PR ferme, selon les verbes de fermeture de GitHub. Une simple
 * mention (« Spec parente : #208 ») ne ferme rien. */
export function fermeturesDepuisCorps(corps) {
  const numeros = [
    ...(corps ?? "").matchAll(new RegExp(MOTS_DE_FERMETURE, "gi")),
  ].map((m) => Number(m[1]));
  return [...new Set(numeros)];
}

const court = (sha) => sha.slice(0, 7);
const liste = (numeros) => numeros.map((n) => `#${n}`).join(", ");
const ok = (id, detail, plus = {}) => ({ id, ok: true, detail, ...plus });
const refus = (id, detail, plus = {}) => ({ id, ok: false, detail, ...plus });

// --- Points -----------------------------------------------------------------------------------

function pointBase(pr, valeurs) {
  return pr.base === valeurs.brancheIntegration
    ? ok("base", `base ${pr.base}`)
    : refus("base", `base ${pr.base}, attendue ${valeurs.brancheIntegration}`);
}

function pointTitre(pr, ticket) {
  return titreCiteLeTicket(pr.titre, ticket)
    ? ok("titre", `le titre cite #${ticket}`)
    : refus("titre", `le titre « ${pr.titre} » ne cite pas #${ticket}`);
}

function pointCloses(pr, ticket) {
  const dansLeTexte = fermeturesDepuisCorps(pr.corps);
  const autres = [...new Set([...dansLeTexte, ...pr.fermeture])]
    .filter((n) => n !== ticket)
    .sort((a, b) => a - b);
  const manque = !dansLeTexte.includes(ticket);
  if (!manque && autres.length === 0) {
    return ok("closes", `Closes #${ticket}, et lui seul`);
  }
  const problemes = [];
  if (manque) problemes.push(`« Closes #${ticket} » absent du corps`);
  if (autres.length > 0) {
    problemes.push(
      manque
        ? `la PR ferme ${liste(autres)}`
        : `ferme aussi ${liste(autres)}, en plus de #${ticket}`,
    );
  }
  return refus("closes", problemes.join(" ; "));
}

function pointMigration(pr) {
  const fichiers = pr.fichiers.filter((f) => estMigration([f]));
  const label = pr.etiquettes.includes(ETIQUETTE_MIGRATION);
  if (fichiers.length > 0 && !label) {
    return refus(
      "migration",
      `il manque le label ${ETIQUETTE_MIGRATION} : la PR modifie ${fichiers[0]}${fichiers.length > 1 ? ` (et ${fichiers.length - 1} autre${fichiers.length > 2 ? "s" : ""})` : ""}`,
    );
  }
  if (fichiers.length === 0 && label) {
    return refus(
      "migration",
      `label ${ETIQUETTE_MIGRATION} en trop : aucun fichier de migration Supabase ne change`,
    );
  }
  return ok(
    "migration",
    label
      ? `label ${ETIQUETTE_MIGRATION} et fichiers de migration`
      : "aucune migration, pas de label",
  );
}

/** Le dernier run d'un contrôle (identifiant le plus grand : une relance remplace l'ancien). */
const dernierRun = (runs) => runs.reduce((a, b) => (b.id > a.id ? b : a));

/** L'état d'un run en un mot : seule la conclusion `success` est verte. */
function etatDuRun(run) {
  if (run.statut !== "completed") return `en cours (${run.statut})`;
  return run.conclusion === "success" ? "vert" : `rouge (${run.conclusion})`;
}

/** Le même état, en un mot que la boucle lit : `vert`, `rouge` ou `en cours`. */
const mot = (run) => etatDuRun(run).replace(/ \(.*\)$/, "");

function pointCi(pr, controles, valeurs) {
  const nom = valeurs.controleCi?.trim();
  if (!nom) {
    return ok(
      "ci",
      "aucun contrôle exigé (controleCi vide dans le fichier de valeurs)",
    );
  }
  const tete = court(pr.tete);
  const runs = controles.filter((c) => c.nom === nom);
  const surLaTete = runs.filter((c) => c.sha === pr.tete);
  if (surLaTete.length === 0) {
    const anterieurs = runs.filter((c) => c.sha !== pr.tete);
    if (anterieurs.length === 0) {
      return refus(
        "ci",
        `contrôle ${nom} absent : aucune exécution sur le commit de tête ${tete}`,
        { etat: "absent" },
      );
    }
    const ancien = dernierRun(anterieurs);
    return refus(
      "ci",
      `contrôle ${nom} ${etatDuRun(ancien)} sur un commit antérieur (${court(ancien.sha)}), aucune exécution sur le commit de tête ${tete}`,
      { etat: "absent" },
    );
  }
  const run = dernierRun(surLaTete);
  const detail = `contrôle ${nom} ${etatDuRun(run)} sur le commit de tête ${tete}`;
  const plus = { etat: mot(run), url: run.url };
  return run.statut === "completed" && run.conclusion === "success"
    ? ok("ci", detail, plus)
    : refus("ci", detail, plus);
}

function pointLabels(pr, issue, ticket) {
  if (!issue) {
    return refus(
      "labels",
      `ticket #${ticket} illisible : ses labels ne sont pas vérifiables`,
    );
  }
  const bloquants = [
    ...ETIQUETTES_BLOQUANTES.filter((e) => issue.etiquettes.includes(e)).map(
      (e) => `ticket #${ticket} porte ${e}`,
    ),
    ...ETIQUETTES_BLOQUANTES.filter((e) => pr.etiquettes.includes(e)).map(
      (e) => `PR #${pr.numero} porte ${e}`,
    ),
  ];
  return bloquants.length === 0
    ? ok("labels", "aucun label bloquant sur le ticket ni sur la PR")
    : refus("labels", bloquants.join(" ; "));
}

function pointConflit(pr, valeurs) {
  const branche = valeurs.brancheIntegration;
  if (pr.fusion === "MERGEABLE") {
    return ok("conflit", `aucun conflit avec ${branche}`);
  }
  if (pr.fusion === "CONFLICTING") {
    return refus("conflit", `conflit avec ${branche}`);
  }
  return refus(
    "conflit",
    `état de fusion avec ${branche} pas encore calculé par GitHub : relancer la vérification`,
  );
}

// --- Décision ---------------------------------------------------------------------------------

const POINTS = [
  "pr",
  "base",
  "titre",
  "closes",
  "migration",
  "ci",
  "labels",
  "conflit",
];

/** Le verdict sur la PR d'un ticket. Pure : `situation` est déjà lue, rien n'est exécuté.
 *
 *  situation = {
 *    ticket   : numéro du ticket
 *    prs      : [numéro]   PR ouvertes dont la branche est `ticket-<n>`
 *    pr       : { numero, titre, corps, base, tete, etiquettes, fichiers, fermeture, fusion } | null
 *               `fichiers` : chemins modifiés (anciens noms compris) ; `fermeture` : tickets que
 *               GitHub lie à la PR ; `fusion` : MERGEABLE | CONFLICTING | UNKNOWN ;
 *               null quand `prs` n'a pas exactement un élément
 *    issue    : { etiquettes } | null   le ticket relu à l'instant (null : illisible)
 *    controles: [{ id, nom, sha, statut, conclusion }]   contrôles du commit de tête, et des
 *               commits antérieurs de la PR quand le contrôle manque sur la tête
 *  }
 *  valeurs = { brancheIntegration, controleCi } */
export function decider(situation, valeurs) {
  const { ticket, prs, pr, issue, controles } = situation;
  let points;
  if (prs.length === 1 && pr) {
    points = [
      ok(
        "pr",
        `une seule PR ouverte pour ${brancheTicket(ticket)} : #${pr.numero}`,
      ),
      pointBase(pr, valeurs),
      pointTitre(pr, ticket),
      pointCloses(pr, ticket),
      pointMigration(pr),
      pointCi(pr, controles, valeurs),
      pointLabels(pr, issue, ticket),
      pointConflit(pr, valeurs),
    ];
  } else {
    const detail =
      prs.length === 0
        ? `aucune PR ouverte pour la branche ${brancheTicket(ticket)}`
        : `${prs.length} PR ouvertes pour la branche ${brancheTicket(ticket)} : ${liste(prs)}`;
    points = POINTS.map((id) =>
      id === "pr"
        ? refus(id, detail)
        : { ...refus(id, "non vérifié : pas de PR unique"), verifie: false },
    );
  }
  const raisons = points
    .filter((p) => !p.ok)
    .map((p) => `${p.id} : ${p.detail}`);
  return {
    ticket,
    pr: pr?.numero ?? null,
    tete: pr?.tete ?? null,
    fusionnable: raisons.length === 0,
    points,
    raisons,
  };
}

// --- Sortie lisible ---------------------------------------------------------------------------

/** Une ligne de verdict puis une ligne par point. */
export function formater(verdict) {
  const sujet =
    verdict.pr === null
      ? `Ticket #${verdict.ticket}`
      : `PR #${verdict.pr} du ticket #${verdict.ticket}`;
  // Sans PR unique, les autres points ne sont pas jugés : seul le point « pr » est un manquement.
  const manquements = verdict.points.filter(
    (p) => !p.ok && p.verifie !== false,
  ).length;
  const entete = verdict.fusionnable
    ? `${sujet} : fusionnable (commit de tête ${court(verdict.tete)})`
    : `${sujet} : NON fusionnable (${manquements} manquement${manquements > 1 ? "s" : ""})`;
  const lignes = verdict.points.map(
    (p) => `  [${p.ok ? "ok" : "refus"}] ${p.id} : ${p.detail}`,
  );
  return [entete, ...lignes].join("\n");
}

// --- Lecture du monde -------------------------------------------------------------------------

const json = (texte) => JSON.parse(texte);
const lignesJson = (texte) =>
  texte
    .split("\n")
    .filter(Boolean)
    .map((ligne) => JSON.parse(ligne));
const attendre = (ms) => new Promise((fin) => setTimeout(fin, ms));

const CHAMPS_PR =
  "number,title,body,baseRefName,headRefOid,labels,mergeable,closingIssuesReferences,commits";

/** Les contrôles (check runs) d'un commit, du plus récent au plus ancien run. */
function controlesDuCommit(gh, depot, sha) {
  return lignesJson(
    gh(
      "api",
      "--paginate",
      `repos/${depot}/commits/${sha}/check-runs`,
      "--jq",
      ".check_runs[] | {id, nom: .name, statut: .status, conclusion, url: .html_url}",
    ),
  ).map((c) => ({ ...c, sha }));
}

/** `mergeable` reste UNKNOWN le temps que GitHub le calcule : quelques lectures avant de conclure. */
async function lirePr(gh, depot, numero) {
  let brute;
  for (let essai = 0; essai < LECTURES_FUSION; essai++) {
    brute = json(
      gh("pr", "view", String(numero), "--repo", depot, "--json", CHAMPS_PR),
    );
    if (brute.mergeable !== "UNKNOWN") break;
    if (essai < LECTURES_FUSION - 1) await attendre(ATTENTE_FUSION_MS);
  }
  return brute;
}

async function lire({ ticket, valeurs, env }) {
  const gh = (...args) => executer("gh", args, { env });
  const depot = valeurs.depot;
  const prs = json(
    gh(
      "pr",
      "list",
      "--repo",
      depot,
      "--state",
      "open",
      "--head",
      brancheTicket(ticket),
      "--json",
      "number",
    ),
  ).map((p) => p.number);

  let issue = null;
  try {
    issue = {
      etiquettes: json(
        gh(
          "issue",
          "view",
          String(ticket),
          "--repo",
          depot,
          "--json",
          "labels",
        ),
      ).labels.map((l) => l.name),
    };
  } catch {
    // Illisible : `decider` refuse sur le point labels.
  }

  if (prs.length !== 1) return { ticket, prs, pr: null, issue, controles: [] };

  const brute = await lirePr(gh, depot, prs[0]);
  const fichiers = gh(
    "api",
    "--paginate",
    `repos/${depot}/pulls/${prs[0]}/files`,
    "--jq",
    ".[] | .filename, (.previous_filename // empty)",
  )
    .split("\n")
    .filter(Boolean);
  const pr = {
    numero: brute.number,
    titre: brute.title,
    corps: brute.body ?? "",
    base: brute.baseRefName,
    tete: brute.headRefOid,
    etiquettes: brute.labels.map((l) => l.name),
    fichiers,
    fermeture: brute.closingIssuesReferences.map((r) => r.number),
    fusion: brute.mergeable,
  };

  const nom = valeurs.controleCi?.trim();
  let controles = [];
  if (nom) {
    controles = controlesDuCommit(gh, depot, pr.tete);
    // Le contrôle manque sur la tête : chercher où il a tourné, pour dire « vert sur un commit
    // antérieur » plutôt que « absent ».
    if (!controles.some((c) => c.nom === nom)) {
      const anterieurs = brute.commits
        .map((c) => c.oid)
        .filter((oid) => oid !== pr.tete)
        .reverse()
        .slice(0, COMMITS_ANTERIEURS_LUS);
      for (const sha of anterieurs) {
        const runs = controlesDuCommit(gh, depot, sha).filter(
          (c) => c.nom === nom,
        );
        if (runs.length > 0) {
          controles.push(...runs);
          break;
        }
      }
    }
  }
  return { ticket, prs, pr, issue, controles };
}

const USAGE =
  "Usage : node scripts/orch/verifier-pr.mjs <numéro de ticket> [--json]";

export async function main(argv) {
  const { values: options, positionals } = parseArgs({
    args: argv,
    allowPositionals: true,
    options: { json: { type: "boolean", default: false } },
  });
  if (!/^\d+$/.test(positionals[0] ?? "")) {
    console.error(USAGE);
    return 1;
  }
  const ticket = Number(positionals[0]);
  // Les valeurs sont celles du checkout où le script se trouve, comme pour lancer.mjs.
  const valeurs = lireValeurs(
    racineCheckoutCourant(dirname(fileURLToPath(import.meta.url))),
  );
  const env = envGh(valeurs.compteGh);

  const verdict = decider(await lire({ ticket, valeurs, env }), valeurs);
  console.log(
    options.json ? JSON.stringify(verdict, null, 2) : formater(verdict),
  );
  return verdict.fusionnable ? 0 : 1;
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
