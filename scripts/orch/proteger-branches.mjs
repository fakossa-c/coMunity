// Pose, retire et affiche la protection de `develop` et de `main` (spec #208, ticket #218).
//
// Usage : node scripts/orch/proteger-branches.mjs --poser | --retirer | --etat [--dry-run]
//
// Pourquoi : la preuve qu'une PR a sa suite verte est le contrôle de CI de GitHub, mais rien
// n'empêchait de fusionner sans lui ni de pousser en direct. Cette commande règle les deux branches
// par l'API GitHub, et la défait d'un geste.
//
// Réglages posés : contrôle de CI du fichier de valeurs (`controleCi`) requis et branche à jour
// avec la base, passage par une PR (sans approbation exigée : le dépôt n'a qu'un propriétaire),
// pas de push forcé, pas de suppression de la branche, règles appliquées aux administrateurs.
//
// État d'avant : à la rédaction du ticket, ni `develop` ni `main` n'étaient protégées. `--retirer`
// supprime la protection de chaque branche, ce qui rend cet état. Pour ne jamais défaire ou écraser
// une protection qu'elle n'a pas posée, `--poser` refuse (sans rien poser) une branche dont les
// réglages existent et diffèrent des siens : `--etat` les montre.
//
// Même architecture que lancer.mjs et verifier-pr.mjs : `lire` (gh, lecture seule), `decider`
// (pure : les protections lues en entrée, les appels à faire en sortie), `executer` (faire, ou
// afficher avec --dry-run). `--etat` ne fait que lire. Pose et retrait changent un réglage réel du
// dépôt qui vaut pour tous, administrateurs compris : ils s'activent à l'étape 9 de la spec #208, sur
// décision de l'utilisateur.
import { execFileSync } from "node:child_process";
import { dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { parseArgs } from "node:util";
import { envGh, lireValeurs, racineCheckoutCourant } from "./commun.mjs";

const BRANCHE_PRODUCTION = "main";
const ACTIONS = ["poser", "retirer", "etat"];
// Réglages de protection que la commande ne pose pas : activés, ils font d'une protection une
// protection qui n'est pas la sienne.
const AUTRES_REGLAGES = [
  "required_linear_history",
  "block_creations",
  "required_conversation_resolution",
  "lock_branch",
  "allow_fork_syncing",
];
const USAGE =
  "Usage : node scripts/orch/proteger-branches.mjs --poser | --retirer | --etat [--dry-run]";

// --- Décision -----------------------------------------------------------------------------------

/** Le corps de l'appel qui pose la protection sur une branche. */
export function reglagesCibles(valeurs) {
  return {
    required_status_checks: {
      strict: true,
      checks: [{ context: valeurs.controleCi }],
    },
    enforce_admins: true,
    required_pull_request_reviews: { required_approving_review_count: 0 },
    restrictions: null,
    allow_force_pushes: false,
    allow_deletions: false,
  };
}

const actif = (reglage) => reglage?.enabled === true;

/** Les réglages d'une réponse de GitHub, sous la forme que la décision compare. Une branche sans
 * protection (`null`) reste `null`. */
export function resumer(reponse) {
  if (!reponse) return null;
  const controles = reponse.required_status_checks;
  const revues = reponse.required_pull_request_reviews;
  return {
    controles: [
      ...new Set([
        ...(controles?.contexts ?? []),
        ...(controles?.checks ?? []).map((c) => c.context),
      ]),
    ].sort(),
    aJourAvecLaBase: controles?.strict === true,
    administrateurs: actif(reponse.enforce_admins),
    pushForce: actif(reponse.allow_force_pushes),
    suppression: actif(reponse.allow_deletions),
    pullRequestObligatoire: Boolean(revues),
    approbations: revues?.required_approving_review_count ?? 0,
    restrictionsDePush: Boolean(reponse.restrictions),
    autres: AUTRES_REGLAGES.filter((nom) => actif(reponse[nom])),
  };
}

const egales = (a, b) => JSON.stringify(a) === JSON.stringify(b);

/** Les réglages que `reglagesCibles` produit, lus comme GitHub les rendrait. */
function resumeCible(valeurs) {
  const cible = reglagesCibles(valeurs);
  return {
    controles: cible.required_status_checks.checks.map((c) => c.context).sort(),
    aJourAvecLaBase: cible.required_status_checks.strict,
    administrateurs: cible.enforce_admins,
    pushForce: cible.allow_force_pushes,
    suppression: cible.allow_deletions,
    pullRequestObligatoire: true,
    approbations:
      cible.required_pull_request_reviews.required_approving_review_count,
    restrictionsDePush: false,
    autres: [],
  };
}

export const branchesProtegees = (valeurs) => [
  valeurs.brancheIntegration,
  BRANCHE_PRODUCTION,
];

const cheminProtection = (valeurs, branche) =>
  `repos/${valeurs.depot}/branches/${branche}/protection`;

/** Les appels à envoyer. `protections` donne la réponse de GitHub pour chaque branche (`null` sans
 * protection). `refus` non vide : aucun appel, pour ne jamais protéger une branche et pas l'autre. */
export function decider({ action, protections }, valeurs) {
  const appels = [];
  const rien = [];
  const refus = [];
  if (action === "etat") return { appels, rien, refus };
  const cible = resumeCible(valeurs);

  for (const branche of branchesProtegees(valeurs)) {
    const existante = resumer(protections[branche] ?? null);
    const chemin = cheminProtection(valeurs, branche);
    if (action === "retirer") {
      if (existante) appels.push({ branche, methode: "DELETE", chemin });
      else rien.push({ branche, raison: "déjà sans protection" });
    } else if (!existante) {
      appels.push({
        branche,
        methode: "PUT",
        chemin,
        corps: reglagesCibles(valeurs),
      });
    } else if (egales(existante, cible)) {
      rien.push({ branche, raison: "déjà protégée comme demandé" });
    } else {
      refus.push({
        branche,
        raison:
          "elle a déjà une protection qui n'est pas celle de la commande ; " +
          "la lire avec --etat avant de décider (rien n'est posé)",
      });
    }
  }
  return { appels: refus.length ? [] : appels, rien, refus };
}

/** Les arguments de `gh` et l'entrée standard (le corps JSON) d'un appel décidé. */
export function appelGh({ methode, chemin, corps }) {
  const args = [
    "api",
    "--method",
    methode,
    "-H",
    "Accept: application/vnd.github+json",
    chemin,
  ];
  if (corps === undefined) return { args };
  return { args: [...args, "--input", "-"], entree: JSON.stringify(corps) };
}

// --- Texte --------------------------------------------------------------------------------------

const ouiNon = (valeur) => (valeur ? "oui" : "non");

function decrire(resume) {
  return [
    `  contrôles requis : ${resume.controles.join(", ") || "aucun"}`,
    `  à jour avec la base : ${ouiNon(resume.aJourAvecLaBase)}`,
    `  PR obligatoire : ${ouiNon(resume.pullRequestObligatoire)} (${resume.approbations} approbation exigée)`,
    `  appliquée aux administrateurs : ${ouiNon(resume.administrateurs)}`,
    `  push forcé autorisé : ${ouiNon(resume.pushForce)}`,
    `  suppression de la branche autorisée : ${ouiNon(resume.suppression)}`,
    `  restrictions de push : ${ouiNon(resume.restrictionsDePush)}`,
    ...(resume.autres.length
      ? [`  autres réglages actifs : ${resume.autres.join(", ")}`]
      : []),
  ].join("\n");
}

/** Les réglages de chaque branche, lisibles. */
export function formaterEtat(protections, valeurs) {
  return branchesProtegees(valeurs)
    .map((branche) => {
      const resume = resumer(protections[branche] ?? null);
      return resume
        ? `${branche} : protégée\n${decrire(resume)}`
        : `${branche} : aucune protection`;
    })
    .join("\n");
}

/** Les appels qu'une exécution enverrait, pour `--dry-run`. */
export function formaterAppels(appels) {
  return appels
    .map(({ methode, chemin, corps }) =>
      [`${methode} ${chemin}`, corps && JSON.stringify(corps, null, 2)]
        .filter(Boolean)
        .join("\n"),
    )
    .join("\n");
}

// --- Lecture et exécution -----------------------------------------------------------------------

const NON_PROTEGEE = /Branch not protected/;

function lireProtection(env, valeurs, branche) {
  try {
    return JSON.parse(
      execFileSync("gh", ["api", cheminProtection(valeurs, branche)], {
        env,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
      }),
    );
  } catch (erreur) {
    if (NON_PROTEGEE.test(`${erreur.stderr ?? ""}${erreur.stdout ?? ""}`)) {
      return null;
    }
    throw new Error(
      `Lecture de la protection de ${branche} impossible : ${erreur.stderr || erreur.message}`,
    );
  }
}

function lire(env, valeurs) {
  return Object.fromEntries(
    branchesProtegees(valeurs).map((b) => [b, lireProtection(env, valeurs, b)]),
  );
}

function envoyer(env, appel) {
  const { args, entree } = appelGh(appel);
  execFileSync("gh", args, {
    env,
    input: entree,
    encoding: "utf8",
    stdio: ["pipe", "pipe", "pipe"],
  });
}

export async function main(argv) {
  const { values: options } = parseArgs({
    args: argv,
    options: {
      poser: { type: "boolean", default: false },
      retirer: { type: "boolean", default: false },
      etat: { type: "boolean", default: false },
      "dry-run": { type: "boolean", default: false },
    },
  });
  const demandees = ACTIONS.filter((a) => options[a]);
  if (demandees.length !== 1) {
    console.error(USAGE);
    return 1;
  }
  const [action] = demandees;
  // Les valeurs sont celles du checkout où le script se trouve, comme pour lancer.mjs.
  const valeurs = lireValeurs(
    racineCheckoutCourant(dirname(fileURLToPath(import.meta.url))),
  );
  const env = envGh(valeurs.compteGh);
  const protections = lire(env, valeurs);

  if (action === "etat") {
    console.log(formaterEtat(protections, valeurs));
    return 0;
  }

  const { appels, rien, refus } = decider({ action, protections }, valeurs);
  for (const { branche, raison } of rien) console.log(`${branche} : ${raison}`);
  for (const { branche, raison } of refus) {
    console.error(`${branche} : ${raison}`);
  }
  if (refus.length) return 1;

  if (options["dry-run"]) {
    if (appels.length) console.log(formaterAppels(appels));
    return 0;
  }
  for (const appel of appels) {
    envoyer(env, appel);
    console.log(
      `${appel.branche} : ${action === "poser" ? "protégée" : "protection retirée"}`,
    );
  }
  if (appels.length) {
    console.log(formaterEtat(lire(env, valeurs), valeurs));
  }
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
