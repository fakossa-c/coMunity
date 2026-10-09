// Termine un ticket dont la PR est fusionnable, du début à la fin (spec #208, ticket #212).
//
// Usage : node scripts/orch/cloturer.mjs <numéro> [--dry-run] [--changement "<texte>"]
//                                        [--reste "<texte>"]
//
// Pourquoi : l'orchestrateur oubliait une étape sur trois après une fusion (issue restée ouverte,
// worktree non retiré, migration non poussée). Ici l'ordre est fixe : vérification de la PR, fusion
// sur le commit vérifié, mise à jour de `develop`, poussée de la migration, clôture du ticket puis de
// sa spec, retrait de la session, du service et du worktree.
//
// PR en retard sur `develop` (état BEHIND, que la protection `strict` rend bloquant) : si c'est son
// seul manquement, la clôture met la branche à jour puis s'arrête (code 3) sans fusionner. Le
// commit de tête change et le contrôle de CI repart (14 à 17 minutes) : la fusion se fait à la
// clôture suivante, sur le commit que la vérification aura relu avec son contrôle vert.
//
// Relançable : la fonction de décision ne planifie que ce qui n'est pas encore fait, d'après ce que
// la couche de lecture observe (PR fusionnée, `develop` qui contient la fusion, commentaire de
// clôture posé, session, worktree et entrée d'état encore présents). Une étape qui échoue après la
// fusion est écrite en commentaire sur le ticket ; la même commande, relancée, reprend là.
//
// Trois couches, comme lancer.mjs et verifier-pr.mjs : `lire` (gh, git, claude, disque), `decider`
// (pure : la situation en entrée, les actions ou les raisons du refus en sortie), `executerAction`
// (faire, ou afficher avec --dry-run). La vérification de PR est celle de verifier-pr.mjs : son
// verdict JSON porte le commit de tête à fusionner. Le mode répétition lit tout mais n'écrit rien.
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { parseArgs } from "node:util";
import {
  argsMiseAJourBranche,
  cheminsEtat,
  ecrireJson,
  envGh,
  executer,
  executerCommande,
  explicationRefusMiseAJour,
  lireEtat,
  lireValeurs,
  modifierEntree,
  racineCheckoutCourant,
  racineCheckoutPrincipal,
  specDepuisCorps,
} from "./commun.mjs";
import {
  brancheTicket,
  dossierWorktree,
  worktreeEnregistre,
} from "./lancer.mjs";
import { enRetardSeulement } from "./verifier-pr.mjs";

const ETIQUETTE_MIGRATION = "migration";
/** Code de sortie d'une clôture suspendue : la branche est mise à jour, la fusion attend le contrôle
 * du nouveau commit de tête. Ni un succès (le ticket n'est pas clos) ni un échec. */
export const CODE_CLOTURE_SUSPENDUE = 3;
// Ce qui se voit d'un résident ou de la base : le reste est de l'outillage, de la config ou des docs.
const CHEMINS_DU_PRODUIT = /^(?:src|supabase|public)\//;

/** Repère du commentaire de clôture : sa présence sur le ticket dit « clôture faite ». Le numéro
 * est entouré, pour que `#21` ne reconnaisse pas le commentaire de `#212`. */
export const marqueurCloture = (ticket) => `<!-- cloture-orch:${ticket}: -->`;

export const cheminHookRetrait = (home) =>
  join(home, ".claude", "hooks", "worktree-remove.mjs");

// --- Textes -----------------------------------------------------------------------------------

/** Ce que la PR change pour les résidents, d'après ses fichiers seuls. */
export function changementPourLesResidents(fichiers) {
  return fichiers.some((f) => CHEMINS_DU_PRODUIT.test(f.replace(/\\/g, "/")))
    ? "La PR touche l'application ou la base : voir sa description."
    : "Rien de visible pour les résidents : la PR ne touche ni src/, ni supabase/, ni public/.";
}

const lignesDeListe = (tickets) =>
  [...tickets]
    .sort((a, b) => a.numero - b.numero)
    .map((t) => `- #${t.numero} ${t.titre}`)
    .join("\n");

const livraison = (ticket, pr) =>
  `la PR de #${ticket} (#${pr.numero}, « ${pr.titre} »)`;

/** Le commentaire posé sur le ticket à sa clôture. Il porte le repère qui évite de le poser deux
 * fois. */
export function commentaireCloture({ ticket, pr, changement, reste }) {
  return [
    `Livré par ${livraison(ticket, pr)}, fusionnée dans develop.`,
    `**Ce qui change pour l'utilisateur** : ${changement}`,
    `**Ce qui reste** : ${reste}`,
    marqueurCloture(ticket),
  ].join("\n\n");
}

/** Le résumé qui accompagne la fermeture d'une spec dont le dernier ticket vient d'être livré. */
export function resumeSpec({ spec, ticket, pr }) {
  return [
    `Tous les tickets de la spec #${spec.numero} sont fermés :`,
    lignesDeListe(spec.tickets),
    `Dernier ticket : #${ticket}, livré par ${livraison(ticket, pr)}.`,
  ].join("\n\n");
}

/** Le commentaire posé sur le ticket quand une étape échoue après la fusion. */
export function texteEchec({ ticket, action, message, faites }) {
  return [
    `La clôture de #${ticket} s'est arrêtée à l'étape « ${action.type} » : ${message}`,
    `Déjà fait : ${faites.length > 0 ? faites.join(", ") : "rien"}.`,
    `Pour reprendre sans rien refaire : \`node scripts/orch/cloturer.mjs ${ticket}\`.`,
  ].join("\n\n");
}

// --- Décision ---------------------------------------------------------------------------------

/** Ce qu'il reste à faire pour clôturer le ticket, ou pourquoi on refuse. Pure : `situation` est
 * déjà lue et rien n'est exécuté ici.
 *
 *  situation = {
 *    ticket, racine, home
 *    pr            : { numero, etat: OPEN | MERGED, titre, etiquettes, fichiers, fusionCommit } | null
 *    verdict       : le JSON de verifier-pr.mjs ({ fusionnable, tete, raisons, points }) pour une
 *                    PR ouverte, null pour une PR déjà fusionnée
 *    misesAJourBranche : combien de fois la branche de ce ticket a déjà été mise à jour (état)
 *    developAJour  : le `develop` du checkout principal contient la fusion
 *    brancheCheckoutPrincipal : la branche du checkout principal (`develop` pour le mettre à jour)
 *    migrationPoussee : la poussée distante est déjà faite (notée dans l'état)
 *    issue         : { etat, cloture }  `cloture` : le commentaire de clôture est posé
 *    spec          : { numero, titre, etat, tickets: [{ numero, titre, etat }] } | null
 *    session       : { id, etat } | null   encore listée par `claude agents --json --all`
 *    worktreeExiste, entreeEtat
 *    changement, reste : textes imposés par l'appelant (facultatifs)
 *  }
 *
 * Rend { refus, actions } et, quand la clôture s'arrête après la mise à jour de la branche d'une PR
 * en retard, `suspendue` : pourquoi rien n'est fusionné ce coup-ci. */
export function decider(situation, valeurs) {
  const { ticket, pr, verdict, issue, spec, session } = situation;
  if (!pr) {
    return {
      refus: [`Aucune PR pour la branche ${brancheTicket(ticket)}.`],
      actions: [],
    };
  }
  const aFusionner = pr.etat === "OPEN";
  if (aFusionner) {
    if (!verdict) {
      return {
        refus: [`La vérification de la PR de #${ticket} manque.`],
        actions: [],
      };
    }
    if (!verdict.fusionnable && enRetardSeulement(verdict)) {
      return planMiseAJourBranche(situation, valeurs);
    }
    if (!verdict.fusionnable) {
      return {
        refus: [
          `La PR de #${ticket} n'est pas fusionnable :`,
          ...verdict.raisons.map((r) => `  ${r}`),
        ],
        actions: [],
      };
    }
  }

  const branche = valeurs.brancheIntegration;
  const doitMettreDevelopAJour = aFusionner || !situation.developAJour;
  if (
    doitMettreDevelopAJour &&
    situation.brancheCheckoutPrincipal !== branche
  ) {
    return {
      refus: [
        `Le checkout principal est sur « ${situation.brancheCheckoutPrincipal || "(HEAD détachée)"} », pas sur ${branche} : s'y placer avant de clôturer, pour que ${branche} se mette à jour après la fusion.`,
      ],
      actions: [],
    };
  }
  const nomBranche = brancheTicket(ticket);
  const dossier = dossierWorktree(situation.racine, valeurs, ticket);
  const fichierEtat = cheminsEtat({
    home: situation.home,
    projet: valeurs.projet,
  }).fichier;
  const migration = pr.etiquettes.includes(ETIQUETTE_MIGRATION);
  // Le commentaire de clôture se pose après la poussée : s'il existe, la migration est partie,
  // même si l'entrée d'état qui le notait est déjà effacée.
  const dejaPoussee = situation.migrationPoussee || issue.cloture;
  const pousser =
    migration && valeurs.pousserMigrationsApresFusion && !dejaPoussee;
  const commandePoussee = valeurs.commandes.migrationDistante;

  const actions = [];
  if (aFusionner) {
    actions.push({ type: "fusionner", pr: pr.numero, tete: verdict.tete });
  }
  if (doitMettreDevelopAJour) {
    actions.push({ type: "majDevelop", racine: situation.racine, branche });
  }
  if (pousser) {
    actions.push(
      {
        type: "listerMigrations",
        commande: commandePoussee,
        racine: situation.racine,
      },
      {
        type: "pousserMigrations",
        commande: `${commandePoussee} -- --appliquer`,
        racine: situation.racine,
      },
      { type: "noterMigrationPoussee", ticket, fichierEtat },
    );
  }

  if (!issue.cloture) {
    const migrationRestante = migration && !pousser && !dejaPoussee;
    const reste =
      situation.reste ??
      (migrationRestante
        ? `Pousser la migration à la main depuis le checkout principal sur develop à jour : \`${commandePoussee}\`, puis \`${commandePoussee} -- --appliquer\`.`
        : "Rien.");
    actions.push(
      { type: "statut", ticket, statut: "Done" },
      { type: "fermerTicket", ticket },
      {
        type: "commenterTicket",
        ticket,
        corps: commentaireCloture({
          ticket,
          pr,
          changement:
            situation.changement ?? changementPourLesResidents(pr.fichiers),
          reste,
        }),
      },
    );
  }

  const ouverts =
    spec?.tickets.filter((t) => t.etat === "OPEN" && t.numero !== ticket) ?? [];
  if (spec && spec.etat === "OPEN" && ouverts.length === 0) {
    actions.push({
      type: "fermerSpec",
      spec: spec.numero,
      corps: resumeSpec({ spec, ticket, pr }),
    });
  }

  // Une session `done` ou `idle` garde son processus ouvert dans le worktree et fait refuser le
  // retrait : toute session encore listée s'arrête, quel que soit son état.
  if (session) {
    actions.push({ type: "arreterSession", id: session.id });
  }
  if (situation.worktreeExiste) {
    actions.push(
      { type: "arreterService", commande: valeurs.commandes.arret, dossier },
      {
        type: "retirerWorktree",
        hook: cheminHookRetrait(situation.home),
        nom: nomBranche,
        racine: situation.racine,
        dossier,
      },
    );
  }
  if (session) actions.push({ type: "supprimerSession", id: session.id });
  if (situation.entreeEtat || pousser) {
    actions.push({ type: "effacerEtat", ticket, fichierEtat });
  }
  return { refus: [], actions };
}

/** PR verte sur son commit de tête mais en retard sur la base : mettre sa branche à jour, sans
 * fusionner. Au-delà de `misesAJourBrancheMax` mises à jour du même ticket, c'est à l'utilisateur de
 * trancher (une autre PR passe devant à chaque tour). */
function planMiseAJourBranche(situation, valeurs) {
  const { ticket, pr, verdict } = situation;
  const faites = situation.misesAJourBranche ?? 0;
  const branche = valeurs.brancheIntegration;
  if (faites >= valeurs.misesAJourBrancheMax) {
    return {
      refus: [
        `La branche de la PR #${pr.numero} (ticket #${ticket}) a déjà été mise à jour ${faites} fois avec ${branche} (maximum ${valeurs.misesAJourBrancheMax}) et reste en retard : la mettre à jour et la fusionner à la main.`,
      ],
      actions: [],
    };
  }
  // Le compteur vit dans l'entrée d'état du ticket : sans elle (ticket lancé à la main), la borne
  // ne tiendrait pas et la mise à jour pourrait se répéter sans fin.
  if (!situation.entreeEtat) {
    return {
      refus: [
        `La PR #${pr.numero} est en retard sur ${branche}, mais le ticket #${ticket} n'est pas suivi par l'état de la boucle : le nombre de mises à jour ne peut pas être compté. La mettre à jour à la main (\`gh pr update-branch ${pr.numero}\`), attendre le contrôle du nouveau commit de tête, puis relancer la clôture.`,
      ],
      actions: [],
    };
  }
  const fichierEtat = cheminsEtat({
    home: situation.home,
    projet: valeurs.projet,
  }).fichier;
  return {
    refus: [],
    actions: [
      { type: "noterMiseAJourBranche", ticket, fichierEtat },
      { type: "mettreAJourBranche", pr: pr.numero, tete: verdict.tete },
    ],
    suspendue: `La PR #${pr.numero} était en retard sur ${branche} : sa branche est mise à jour, le contrôle de CI repart sur le nouveau commit de tête. Pas de fusion ce coup-ci : relancer la clôture une fois le contrôle vert sur ce commit (\`node scripts/orch/verifier-pr.mjs ${ticket}\`).`,
  };
}

/** Une ligne par action, pour --dry-run et le suivi de l'exécution. */
export function decrire(action) {
  switch (action.type) {
    case "fusionner":
      return `Fusionner la PR #${action.pr} (gh pr merge --merge) sur le commit de tête ${action.tete.slice(0, 7)}`;
    case "noterMiseAJourBranche":
      return `Compter une mise à jour de branche pour #${action.ticket} dans ${action.fichierEtat}`;
    case "mettreAJourBranche":
      return `Mettre à jour la branche de la PR #${action.pr} avec la base (commit de tête attendu ${action.tete.slice(0, 7)}), sans fusionner`;
    case "majDevelop":
      return `Mettre ${action.branche} à jour dans le checkout principal (${action.racine})`;
    case "listerMigrations":
      return `Lister les migrations à pousser : ${action.commande}`;
    case "pousserMigrations":
      return `Pousser les migrations sur le Supabase distant : ${action.commande}`;
    case "noterMigrationPoussee":
      return `Noter la migration de #${action.ticket} comme poussée dans ${action.fichierEtat}`;
    case "statut":
      return `Passer le ticket #${action.ticket} « ${action.statut} » sur le tableau`;
    case "fermerTicket":
      return `Fermer le ticket #${action.ticket} (sans effet si la fusion l'a déjà fermé)`;
    case "commenterTicket":
      return `Écrire le commentaire de clôture sur le ticket #${action.ticket}`;
    case "fermerSpec":
      return `Fermer la spec #${action.spec} avec un résumé (c'était son dernier ticket ouvert)`;
    case "arreterSession":
      return `Arrêter la session de fond ${action.id} (claude stop)`;
    case "arreterService":
      return `Arrêter le Supabase du worktree ${action.dossier} : ${action.commande}`;
    case "retirerWorktree":
      return `Retirer le worktree ${action.nom} par le hook ${action.hook}`;
    case "supprimerSession":
      return `Supprimer la session de fond ${action.id} (claude rm)`;
    case "effacerEtat":
      return `Effacer l'entrée de #${action.ticket} dans ${action.fichierEtat}`;
    default:
      throw new Error(`Action inconnue : ${action.type}`);
  }
}

// --- Lecture ----------------------------------------------------------------------------------

const json = (texte) => JSON.parse(texte);

/** Le verdict de verifier-pr.mjs. La commande sort en 1 quand la PR n'est pas fusionnable mais
 * écrit tout de même son verdict : seule une sortie sans JSON est une erreur. */
function verdictDeVerification(sources, ticket, env) {
  const script = join(sources, "scripts", "orch", "verifier-pr.mjs");
  let sortie;
  try {
    sortie = executer(process.execPath, [script, String(ticket), "--json"], {
      env,
    });
  } catch (erreur) {
    sortie = erreur.stdout?.toString() ?? "";
    if (!sortie.trim().startsWith("{")) {
      throw new Error(
        `La vérification de la PR a échoué : ${erreur.stderr?.toString().trim() || erreur.message}`,
      );
    }
  }
  return json(sortie);
}

/** La session du ticket dans `claude agents --json --all` : par l'identifiant gardé dans l'état,
 * sinon par son nom. Une session interactive n'a pas d'identifiant : elle ne correspond à rien. */
export function trouverSession(sessions, entree, branche) {
  return (
    sessions.find(
      (s) => s.id && (s.id === entree?.session || s.name === branche),
    ) ?? null
  );
}

const estAncetre = (racine, commit, branche) => {
  try {
    executer("git", [
      "-C",
      racine,
      "merge-base",
      "--is-ancestor",
      commit,
      branche,
    ]);
    return true;
  } catch {
    return false;
  }
};

function lireSpec(gh, valeurs, numero) {
  const brute = json(
    gh(
      "issue",
      "view",
      String(numero),
      "--repo",
      valeurs.depot,
      "--json",
      "state,title",
    ),
  );
  const tickets = gh(
    "api",
    "--paginate",
    `repos/${valeurs.depot}/issues/${numero}/sub_issues`,
    "--jq",
    ".[] | {numero: .number, titre: .title, etat: (.state | ascii_upcase)} | tojson",
  )
    .split("\n")
    .filter(Boolean)
    .map((ligne) => json(ligne));
  return { numero, titre: brute.title, etat: brute.state, tickets };
}

function lire({ ticket, options, racine, sources, valeurs, env, home }) {
  const gh = (...args) => executer("gh", args, { env });
  const depot = valeurs.depot;
  const branche = brancheTicket(ticket);

  const prs = json(
    gh(
      "pr",
      "list",
      "--repo",
      depot,
      "--head",
      branche,
      "--state",
      "all",
      "--json",
      "number,state,title,labels,mergeCommit",
    ),
  );
  const ouvertes = prs.filter((p) => p.state === "OPEN");
  const fusionnees = prs
    .filter((p) => p.state === "MERGED")
    .sort((a, b) => b.number - a.number);
  const brute = ouvertes[0] ?? fusionnees[0] ?? null;

  let pr = null;
  let verdict = null;
  let developAJour = false;
  if (brute) {
    const fichiers = gh(
      "api",
      "--paginate",
      `repos/${depot}/pulls/${brute.number}/files`,
      "--jq",
      ".[].filename",
    )
      .split("\n")
      .filter(Boolean);
    pr = {
      numero: brute.number,
      etat: brute.state,
      titre: brute.title,
      etiquettes: brute.labels.map((l) => l.name),
      fichiers,
      fusionCommit: brute.mergeCommit?.oid ?? null,
    };
    if (pr.etat === "OPEN") {
      verdict = verdictDeVerification(sources, ticket, env);
    } else if (pr.fusionCommit) {
      developAJour = estAncetre(
        racine,
        pr.fusionCommit,
        valeurs.brancheIntegration,
      );
    }
  }

  const cheminEtat = cheminsEtat({ home, projet: valeurs.projet }).fichier;
  const entree = lireEtat(cheminEtat).tickets[String(ticket)] ?? null;

  const issueBrute = json(
    gh(
      "issue",
      "view",
      String(ticket),
      "--repo",
      depot,
      "--json",
      "state,body,comments",
    ),
  );
  const repere = marqueurCloture(ticket);
  const issue = {
    etat: issueBrute.state,
    cloture: issueBrute.comments.some(
      (c) => c.author?.login === valeurs.compteGh && c.body.includes(repere),
    ),
  };
  const numeroSpec = specDepuisCorps(issueBrute.body)?.numero;

  const sessions = json(executer("claude", ["agents", "--json", "--all"]));
  const sessionTrouvee = trouverSession(sessions, entree, branche);

  const dossier = dossierWorktree(racine, valeurs, ticket);
  return {
    ticket,
    racine,
    home,
    pr,
    verdict,
    developAJour,
    brancheCheckoutPrincipal: brancheCourante(racine),
    migrationPoussee: entree?.migrationPoussee === true,
    misesAJourBranche: entree?.misesAJourBranche ?? 0,
    issue,
    spec: numeroSpec ? lireSpec(gh, valeurs, numeroSpec) : null,
    session: sessionTrouvee
      ? { id: sessionTrouvee.id, etat: sessionTrouvee.state }
      : null,
    worktreeExiste:
      existsSync(dossier) ||
      worktreeEnregistre(
        executer("git", ["-C", racine, "worktree", "list", "--porcelain"]),
        dossier,
      ),
    entreeEtat: entree !== null,
    changement: options.changement,
    reste: options.reste,
  };
}

// --- Exécution --------------------------------------------------------------------------------

/** Le nom de la branche du checkout principal, qui doit être `develop` pour la mettre à jour. */
function brancheCourante(racine) {
  return executer("git", ["-C", racine, "branch", "--show-current"]).trim();
}

export function executerAction(action, { sources, env, valeurs }) {
  const gh = (...args) => executer("gh", args, { env });
  switch (action.type) {
    case "fusionner":
      gh(
        "pr",
        "merge",
        String(action.pr),
        "--repo",
        valeurs.depot,
        "--merge",
        "--match-head-commit",
        action.tete,
      );
      return;
    case "noterMiseAJourBranche": {
      // Compté avant l'appel : une mise à jour qui échoue en cours de route compte aussi, pour que
      // la borne tienne même si GitHub répond mal.
      const etat = lireEtat(action.fichierEtat);
      const faites =
        etat.tickets[String(action.ticket)]?.misesAJourBranche ?? 0;
      ecrireJson(
        action.fichierEtat,
        modifierEntree(etat, action.ticket, { misesAJourBranche: faites + 1 }),
      );
      return;
    }
    case "mettreAJourBranche":
      try {
        gh(
          ...argsMiseAJourBranche({
            depot: valeurs.depot,
            pr: action.pr,
            tete: action.tete,
          }),
        );
      } catch (erreur) {
        throw new Error(
          explicationRefusMiseAJour(
            erreur.stderr?.toString().trim() || erreur.message,
          ),
        );
      }
      return;
    case "majDevelop": {
      const courante = brancheCourante(action.racine);
      if (courante !== action.branche) {
        throw new Error(
          `Le checkout principal est sur « ${courante || "(HEAD détachée)"} », pas sur ${action.branche} : s'y placer, puis relancer.`,
        );
      }
      executer("git", ["-C", action.racine, "fetch", "origin", action.branche]);
      executer("git", [
        "-C",
        action.racine,
        "merge",
        "--ff-only",
        `origin/${action.branche}`,
      ]);
      return;
    }
    case "listerMigrations":
    case "pousserMigrations":
      executerCommande(action.commande, { cwd: action.racine });
      return;
    case "noterMigrationPoussee": {
      const etat = lireEtat(action.fichierEtat);
      const cle = String(action.ticket);
      ecrireJson(action.fichierEtat, {
        ...etat,
        tickets: {
          ...etat.tickets,
          [cle]: { ...etat.tickets[cle], migrationPoussee: true },
        },
      });
      return;
    }
    case "statut":
      executer(
        process.execPath,
        [
          join(sources, "scripts", "statut-ticket.mjs"),
          String(action.ticket),
          action.statut,
        ],
        { env },
      );
      return;
    case "fermerTicket": {
      const { state } = json(
        gh(
          "issue",
          "view",
          String(action.ticket),
          "--repo",
          valeurs.depot,
          "--json",
          "state",
        ),
      );
      if (state === "OPEN") {
        gh("issue", "close", String(action.ticket), "--repo", valeurs.depot);
      }
      return;
    }
    case "commenterTicket":
      gh(
        "issue",
        "comment",
        String(action.ticket),
        "--repo",
        valeurs.depot,
        "--body",
        action.corps,
      );
      return;
    case "fermerSpec":
      gh(
        "issue",
        "close",
        String(action.spec),
        "--repo",
        valeurs.depot,
        "--comment",
        action.corps,
      );
      return;
    case "arreterSession":
      try {
        executer("claude", ["stop", action.id]);
      } catch {
        // Déjà arrêtée : `claude rm` supprime aussi une session terminée.
      }
      return;
    case "arreterService":
      // Docker éteint ou service déjà arrêté : le hook de retrait réessaie, rien à bloquer ici.
      try {
        executerCommande(action.commande, { cwd: action.dossier });
      } catch (erreur) {
        console.error(`  service non arrêté (${erreur.message}), on continue`);
      }
      return;
    case "retirerWorktree": {
      // Le hook signale un refus (session active, travail non fusionné) par un message, pas par
      // un code de sortie : seule la disparition du dossier fait foi.
      const sortie = executer(process.execPath, [action.hook, action.nom], {
        cwd: action.racine,
      });
      if (existsSync(action.dossier)) {
        throw new Error(
          `le worktree ${action.nom} est toujours là. Le hook dit : ${sortie.trim() || "(rien)"}`,
        );
      }
      return;
    }
    case "supprimerSession":
      executer("claude", ["rm", action.id]);
      return;
    case "effacerEtat": {
      const etat = lireEtat(action.fichierEtat);
      const tickets = { ...etat.tickets };
      delete tickets[String(action.ticket)];
      ecrireJson(action.fichierEtat, { ...etat, tickets });
      return;
    }
    default:
      throw new Error(`Action inconnue : ${action.type}`);
  }
}

const USAGE =
  'Usage : node scripts/orch/cloturer.mjs <numéro> [--dry-run] [--changement "<texte>"] [--reste "<texte>"]';

export async function main(argv) {
  const { values: options, positionals } = parseArgs({
    args: argv,
    allowPositionals: true,
    options: {
      "dry-run": { type: "boolean", default: false },
      changement: { type: "string" },
      reste: { type: "string" },
    },
  });
  if (!/^\d+$/.test(positionals[0] ?? "")) {
    console.error(USAGE);
    return 1;
  }
  const ticket = Number(positionals[0]);
  const ici = dirname(fileURLToPath(import.meta.url));
  // Le code et les valeurs sont ceux du checkout où le script se trouve ; `develop`, les
  // migrations et le retrait des worktrees se font depuis le checkout principal.
  const sources = racineCheckoutCourant(ici);
  const racine = racineCheckoutPrincipal(ici);
  const valeurs = lireValeurs(sources);
  const env = envGh(valeurs.compteGh);
  const home = homedir();

  const situation = lire({
    ticket,
    options,
    racine,
    sources,
    valeurs,
    env,
    home,
  });
  const { refus, actions, suspendue } = decider(situation, valeurs);
  if (refus.length > 0) {
    for (const ligne of refus) console.error(ligne);
    return 1;
  }
  if (actions.length === 0) {
    console.log(`Le ticket #${ticket} est déjà entièrement clôturé.`);
    return 0;
  }
  if (options["dry-run"]) {
    console.log(
      `Mode répétition (--dry-run) : la clôture de #${ticket} ferait, sans rien modifier :`,
    );
    actions.forEach((a, i) => console.log(`  ${i + 1}. ${decrire(a)}`));
    if (suspendue)
      console.log(
        `Puis elle s'arrêterait (code ${CODE_CLOTURE_SUSPENDUE}) : ${suspendue}`,
      );
    return 0;
  }

  let fusionFaite = situation.pr.etat === "MERGED";
  const faites = [];
  for (const [i, action] of actions.entries()) {
    console.log(`${i + 1}/${actions.length} ${decrire(action)}`);
    try {
      executerAction(action, { sources, env, valeurs });
    } catch (erreur) {
      const message = (
        erreur.stderr?.toString().trim() || erreur.message
      ).trim();
      console.error(`\nÉchec à l'étape ${i + 1} (${action.type}) : ${message}`);
      if (fusionFaite) {
        try {
          executer(
            "gh",
            [
              "issue",
              "comment",
              String(ticket),
              "--repo",
              valeurs.depot,
              "--body",
              texteEchec({ ticket, action, message, faites }),
            ],
            { env },
          );
          console.error(`Signalé sur le ticket #${ticket}.`);
        } catch {
          console.error(
            `Signalement sur le ticket #${ticket} impossible : à écrire à la main.`,
          );
        }
      }
      console.error(
        `Relancer \`node scripts/orch/cloturer.mjs ${ticket}\` : ce qui est fait ne sera pas refait.`,
      );
      return 1;
    }
    faites.push(action.type);
    if (action.type === "fusionner") fusionFaite = true;
  }
  if (suspendue) {
    console.log(`\nClôture suspendue : ${suspendue}`);
    return CODE_CLOTURE_SUSPENDUE;
  }
  console.log(`\nTicket #${ticket} clôturé.`);
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
