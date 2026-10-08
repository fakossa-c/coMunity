// La boucle de livraison (spec #208, ticket #216).
import {
  appendFileSync,
  mkdirSync,
  readFileSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { format, parseArgs } from "node:util";
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
import { main as cloturer } from "./cloturer.mjs";
import { main as frontiere, modeDepuisOptions } from "./frontiere.mjs";
import { brancheTicket, main as lancer } from "./lancer.mjs";
import { main as verifierPr } from "./verifier-pr.mjs";

// --- Verrou -----------------------------------------------------------------------------------

/** Ce que fait une boucle qui démarre devant le verrou du dépôt. Pure : `verrou` est le contenu du
 * fichier de verrou (ou null) et `pidVivant` dit si le processus qu'il nomme tourne encore. Un
 * verrou dont le processus est mort (arrêt brutal, machine éteinte) est repris, pas respecté. */
export function decisionVerrou({ verrou, pidVivant }) {
  if (!verrou) return { action: "prendre" };
  const qui = `pid ${verrou.pid}, lancée le ${verrou.depuis}, ${verrou.mode}`;
  if (pidVivant) {
    return {
      action: "refuser",
      raison: `Une boucle tourne déjà sur ce dépôt (${qui}) : l'arrêter (Ctrl-C) avant d'en lancer une autre.`,
    };
  }
  return {
    action: "reprendre",
    raison: `Verrou d'une boucle qui ne tourne plus (${qui}) : repris.`,
  };
}

/** Prend le verrou du dépôt : le fichier est créé d'un coup (`wx`), donc deux boucles qui démarrent
 * ensemble n'ont jamais toutes les deux le verrou. Rend { ok, raison }. */
export function prendreVerrou({ fichier, pid, mode, maintenant, pidVivant }) {
  const contenu = { pid, depuis: maintenant.toISOString(), mode };
  const ecrire = () => {
    mkdirSync(dirname(fichier), { recursive: true });
    writeFileSync(fichier, `${JSON.stringify(contenu)}\n`, { flag: "wx" });
  };
  try {
    ecrire();
    return { ok: true };
  } catch (erreur) {
    if (erreur.code !== "EEXIST") throw erreur;
  }
  let verrou = null;
  try {
    verrou = JSON.parse(readFileSync(fichier, "utf8"));
  } catch {
    // Verrou illisible (écriture interrompue) : traité comme celui d'une boucle morte.
  }
  const decision = decisionVerrou({
    verrou: verrou ?? { pid: "?", depuis: "?", mode: "?" },
    pidVivant: verrou ? pidVivant(verrou.pid) : false,
  });
  if (decision.action === "refuser")
    return { ok: false, raison: decision.raison };
  unlinkSync(fichier);
  try {
    ecrire();
  } catch (erreur) {
    if (erreur.code !== "EEXIST") throw erreur;
    return {
      ok: false,
      raison: "Une autre boucle vient de prendre le verrou.",
    };
  }
  return { ok: true, raison: decision.raison };
}

/** Rend le verrou, s'il est bien celui de cette boucle. */
export function rendreVerrou({ fichier, pid }) {
  try {
    if (JSON.parse(readFileSync(fichier, "utf8")).pid === pid)
      unlinkSync(fichier);
  } catch {
    // Déjà rendu, ou illisible : rien à rendre.
  }
}

// --- Journal ----------------------------------------------------------------------------------

/** Une ligne de journal : l'heure, l'événement, le ticket s'il y en a un, le détail. Le détail tient
 * sur la ligne, pour que le journal se relise ligne à ligne. */
export function ligneJournal({ evenement, ticket, detail }, maintenant) {
  const morceaux = [
    maintenant.toISOString(),
    evenement,
    ticket === undefined ? null : `#${ticket}`,
    detail.replace(/\s*[\r\n]+\s*/g, " ").trim(),
  ];
  return morceaux.filter((m) => m !== null && m !== "").join(" ");
}

// --- Le tour ----------------------------------------------------------------------------------

const ETIQUETTE_QUESTION = "needs-info";
const ETIQUETTE_RENDU = "ready-for-human";
// Une session `done`, `stopped` ou introuvable ne travaille plus : son résultat est sur le tracker.
const ETATS_SESSION_FINIE = ["done", "stopped"];

const parNumero = (a, b) => a.numero - b.numero;

/** La session d'un ticket : par l'identifiant gardé dans l'état, sinon par son nom. */
const sessionDuTicket = (sessions, entree) =>
  sessions.find((s) => s.id === entree.session || s.name === entree.nom) ??
  null;

/** L'état de la session d'un ticket en vol (`introuvable` si `claude agents` ne la liste plus), et
 * si elle ne travaille plus. */
export function etatDeSession(sessions, entree) {
  const etat = sessionDuTicket(sessions, entree)?.state ?? "introuvable";
  return {
    etat,
    terminee: ETATS_SESSION_FINIE.includes(etat) || etat === "introuvable",
  };
}

/** Ce que la boucle fait de chaque ticket suivi, et pourquoi elle s'arrête. Pure : `situation` est
 * déjà lue, rien n'est exécuté.
 *
 *  situation = {
 *    checkoutPrincipalPropre : le `git status` du checkout principal est vide
 *    tickets   : [{ numero, titre, etat: OPEN | CLOSED, etiquettes }]  les tickets sélectionnés
 *                encore ouverts, et ceux de la sélection restés dans l'état après leur fermeture
 *    etat      : le fichier d'état ({ tickets: { [numéro]: { session, nom, ... } } })
 *    sessions  : [{ id, name, state }]  `claude agents --json --all`
 *    prs       : { [numéro]: { numero, etat: OPEN | MERGED } | null }  la PR ouverte du ticket, à
 *                défaut sa PR fusionnée
 *    verdicts  : { [numéro]: { fusionnable, raisons } }  vérification des PR ouvertes
 *    frontiere : { aLancer, tickets: [{ numero, titre, lancable, raisons }] } | null
 *  }
 *
 * Rend { arret, actions, rapport }. `arret` : null, ou { motif, code, raison }. */
export function decider(situation) {
  const { etat, sessions, prs, verdicts } = situation;
  const actions = [];
  const rapport = {
    enVol: [],
    enAttente: [],
    enAttenteDeReponse: [],
    rendus: [],
  };
  const vus = new Set();
  const aCloturer = new Set();
  const ouverts = situation.tickets.filter((t) => t.etat === "OPEN");

  for (const t of [...situation.tickets].sort(parNumero)) {
    const identite = { ticket: t.numero, titre: t.titre };
    const entree = etat.tickets[String(t.numero)];
    const pr = prs[t.numero] ?? null;

    if (t.etat === "OPEN" && t.etiquettes.includes(ETIQUETTE_RENDU)) {
      rapport.rendus.push(identite);
      if (entree) vus.add(t.numero);
      continue;
    }
    if (t.etat === "OPEN" && t.etiquettes.includes(ETIQUETTE_QUESTION)) {
      rapport.enAttenteDeReponse.push(identite);
      if (entree) vus.add(t.numero);
      continue;
    }
    if (!entree) continue;

    if (t.etat === "CLOSED") {
      // Fermé : il ne reste à finir que la clôture d'une PR déjà fusionnée.
      if (pr?.etat === "MERGED") {
        actions.push({ type: "cloturer", ticket: t.numero, pr: pr.numero });
        aCloturer.add(t.numero);
        vus.add(t.numero);
      } else {
        actions.push({
          type: "attendre",
          ticket: t.numero,
          raison:
            "ticket fermé sans PR fusionnée : l'entrée de l'état est à retirer à la main",
        });
      }
      continue;
    }

    vus.add(t.numero);
    const { etat: etatSession, terminee } = etatDeSession(sessions, entree);
    rapport.enVol.push({ ...identite, session: etatSession });
    if (!terminee) continue;

    if (pr?.etat === "MERGED") {
      actions.push({ type: "cloturer", ticket: t.numero, pr: pr.numero });
      aCloturer.add(t.numero);
    } else if (pr?.etat === "OPEN") {
      const verdict = verdicts[t.numero];
      if (verdict?.fusionnable) {
        actions.push({ type: "cloturer", ticket: t.numero, pr: pr.numero });
        aCloturer.add(t.numero);
      } else {
        actions.push({
          type: "attendre",
          ticket: t.numero,
          raison: verdict
            ? `PR #${pr.numero} non fusionnable : ${verdict.raisons.join(" ; ")}`
            : `PR #${pr.numero} : vérification manquante`,
        });
      }
    } else {
      actions.push({
        type: "rendreHumain",
        ticket: t.numero,
        explication: `La session ${entree.nom} (état ${etatSession}) s'est terminée sans PR ni label : ni PR ouverte pour la branche, ni \`${ETIQUETTE_QUESTION}\`, ni \`${ETIQUETTE_RENDU}\`. La boucle ne sait pas ce qu'elle a fait ; reprendre le ticket à la main (\`claude attach ${entree.session}\` pour relire la session).`,
      });
    }
  }

  const enVolOuverts = rapport.enVol.map((v) => v.ticket);
  const pris = new Set([...vus, ...Object.keys(etat.tickets).map(Number)]);
  for (const f of situation.frontiere?.tickets ?? []) {
    if (pris.has(f.numero)) continue;
    const attend =
      f.lancable && !situation.frontiere.aLancer.includes(f.numero);
    if (!f.lancable || attend) {
      rapport.enAttente.push({
        ticket: f.numero,
        titre: f.titre,
        raisons: f.lancable
          ? ["lançable, attend un créneau (mémoire ou service lourd)"]
          : f.raisons,
      });
    }
  }

  const arret = (() => {
    if (!situation.checkoutPrincipalPropre) {
      return {
        motif: "checkout-sale",
        code: 2,
        raison: `Le checkout principal n'est pas propre (${situation.checkoutPrincipalDetail ?? "modifications non commitées"}) : la boucle s'arrête. Les sessions en cours continuent ; relancer la boucle une fois le checkout remis en état.`,
      };
    }
    if (ouverts.length === 0 && vus.size === 0) {
      return {
        motif: "termine",
        code: 0,
        raison:
          "Plus aucun ticket sélectionné n'est ouvert et rien n'est en vol.",
      };
    }
    return null;
  })();

  if (arret?.motif === "checkout-sale") return { arret, actions: [], rapport };

  const aLancer = arret ? [] : (situation.frontiere?.aLancer ?? []);
  const occupes = enVolOuverts.filter((n) => !aCloturer.has(n));
  for (const numero of aLancer) {
    actions.push({
      type: "lancer",
      ticket: numero,
      enParallele: [...occupes, ...aLancer.filter((n) => n !== numero)].sort(
        (a, b) => a - b,
      ),
    });
  }
  return { arret, actions, rapport };
}

const liste = (elements, texte) =>
  elements.length === 0 ? "aucun" : elements.map(texte).join(" ; ");

/** Le rapport de fin de tour : ce qui attend l'utilisateur et ce que la boucle lui a rendu. */
export function formaterRapport(rapport) {
  return [
    `En vol : ${liste(rapport.enVol, (v) => `#${v.ticket} ${v.titre} (${v.session})`)}`,
    `En attente de lancement : ${liste(rapport.enAttente, (a) => `#${a.ticket} ${a.titre} - ${a.raisons.join(", ")}`)}`,
    `En attente de votre réponse (needs-info) : ${liste(rapport.enAttenteDeReponse, (q) => `#${q.ticket} ${q.titre}`)}`,
    `Rendus (ready-for-human) : ${liste(rapport.rendus, (r) => `#${r.ticket} ${r.titre}`)}`,
  ].join("\n");
}

// --- La boucle --------------------------------------------------------------------------------

// Après une clôture, un ticket est peut-être libéré : on relit tout de suite plutôt que d'attendre
// l'intervalle. Le plafond évite qu'une boucle de clôtures ne tienne le processus sans fin.
const TOURS_IMMEDIATS_MAX = 10;

/** Fait tourner les tours jusqu'à l'arrêt. Les ports portent tout ce qui touche le monde :
 *
 *  ports = {
 *    maintenant()          : Date
 *    arretDemande()        : Ctrl-C reçu
 *    attendre(ms)          : pause entre deux tours (rendue dès qu'un arrêt est demandé)
 *    lireSituation()       : la `situation` de `decider`, lue sur GitHub, git et claude
 *    executer(action, { dryRun }) : fait l'action, rend { ok, evenements }
 *    journal(ligne)        : une ligne de journal
 *    afficher(texte)       : le rapport du tour, à l'écran
 *  }
 *
 * Rend le code de sortie : 0 (fini, ou interrompu par Ctrl-C), 2 (checkout principal sale). */
export async function boucle({
  ports,
  intervalleMs,
  libelleMode,
  dryRun = false,
}) {
  const noter = (evenement) =>
    ports.journal(ligneJournal(evenement, ports.maintenant()));
  noter({
    evenement: "demarrage",
    detail: `${libelleMode}${dryRun ? " (répétition : rien n'est modifié)" : ""}`,
  });

  const raisonsDejaNotees = new Map();
  let dernierRapport = null;
  let toursImmediats = 0;

  for (;;) {
    if (ports.arretDemande()) {
      noter({
        evenement: "arret",
        detail:
          "interrompu : les sessions en vol continuent, relancer la boucle pour reprendre",
      });
      return 0;
    }

    let resultat;
    try {
      resultat = decider(await ports.lireSituation());
    } catch (erreur) {
      noter({ evenement: "erreur", detail: `lecture : ${erreur.message}` });
      if (dryRun) return 1;
      await ports.attendre(intervalleMs);
      continue;
    }

    const texte = formaterRapport(resultat.rapport);
    ports.afficher(texte);
    if (texte !== dernierRapport) {
      noter({ evenement: "rapport", detail: texte.replaceAll("\n", " | ") });
      dernierRapport = texte;
    }

    if (resultat.arret) {
      noter({
        evenement: "arret",
        detail: `${resultat.arret.motif} : ${resultat.arret.raison}`,
      });
      return resultat.arret.code;
    }

    let cloture = false;
    let interrompu = false;
    for (const action of resultat.actions) {
      if (ports.arretDemande()) {
        interrompu = true;
        break;
      }
      const { ok, evenements } = await ports.executer(action, { dryRun });
      for (const evenement of evenements) {
        // Une attente qui dure se dit une fois, pas à chaque tour.
        if (evenement.evenement === "attente") {
          if (raisonsDejaNotees.get(evenement.ticket) === evenement.detail) {
            continue;
          }
          raisonsDejaNotees.set(evenement.ticket, evenement.detail);
        }
        noter(evenement);
      }
      if (ok && action.type === "cloturer") cloture = true;
    }

    if (dryRun) return 0;
    if (interrompu) continue;
    if (cloture && toursImmediats < TOURS_IMMEDIATS_MAX) {
      toursImmediats += 1;
      continue;
    }
    toursImmediats = 0;
    await ports.attendre(intervalleMs);
  }
}

// --- Lecture de ce que rendent les scripts des tickets précédents -----------------------------
//
// La boucle appelle `main` de lancer.mjs, cloturer.mjs, frontiere.mjs et verifier-pr.mjs comme des
// fonctions (jamais comme des sous-processus). Ils parlent par `console` et par leur code de
// retour : `capturer` recueille les deux, pour que la boucle en tire des lignes de journal.

/** Exécute `fonction` en recueillant ce qu'elle écrit par console.log et console.error. Une
 * exception est un échec (code 1) dont le message va dans les erreurs. */
export async function capturer(fonction) {
  const sortie = [];
  const erreurs = [];
  const { log, error } = console;
  console.log = (...args) => sortie.push(format(...args));
  console.error = (...args) => erreurs.push(format(...args));
  let code;
  try {
    code = await fonction();
  } catch (erreur) {
    erreurs.push(erreur.message);
    code = 1;
  } finally {
    console.log = log;
    console.error = error;
  }
  return { code, sortie: sortie.join("\n"), erreurs: erreurs.join("\n") };
}

const DETAIL_MAX = 600;
const court = (texte) =>
  texte.length > DETAIL_MAX ? `${texte.slice(0, DETAIL_MAX)}…` : texte;
const etapeEnEchec = (erreurs) =>
  Number(erreurs.match(/Échec à l'étape (\d+)/)?.[1]) || null;

/** Les lignes de journal d'un lancement, et si le ticket est pris (assigné) malgré un échec.
 * Dépend des messages de lancer.mjs : « Session <nom> lancée (<id>) » et « Échec à l'étape <n> »,
 * l'assignation étant l'étape 1. */
export function evenementsLancement({ ticket, code, sortie, erreurs }) {
  if (code === 0) {
    const lancee = sortie.match(/Session (\S+) lancée \((\w+)\)/);
    return {
      ok: true,
      pris: true,
      evenements: [
        {
          evenement: "lancement",
          ticket,
          detail: lancee
            ? `session ${lancee[1]} lancée (${lancee[2]})`
            : "session lancée",
        },
      ],
    };
  }
  return {
    ok: false,
    pris: (etapeEnEchec(erreurs) ?? 0) >= 2,
    evenements: [
      { evenement: "echec", ticket, detail: `lancement : ${court(erreurs)}` },
    ],
  };
}

/** Les lignes de journal d'une clôture. cloturer.mjs vérifie la PR avant de fusionner et affiche
 * chaque étape avant de la faire (« 1/9 Fusionner la PR… ») : une étape de fusion annoncée dit que
 * la vérification a réussi, et la fusion est faite si la clôture est allée jusqu'au bout ou
 * jusqu'à une étape plus loin. */
export function evenementsCloture({ ticket, code, sortie, erreurs }) {
  const evenements = [];
  const fusion = sortie.match(/^(\d+)\/\d+ Fusionner la PR/m);
  if (fusion) {
    evenements.push({
      evenement: "verification",
      ticket,
      detail: "PR fusionnable, relue par la clôture avant la fusion",
    });
    const echec = etapeEnEchec(erreurs);
    if (code === 0 || (echec && echec > Number(fusion[1]))) {
      evenements.push({
        evenement: "fusion",
        ticket,
        detail: "PR fusionnée",
      });
    }
  }
  evenements.push(
    code === 0
      ? {
          evenement: "cloture",
          ticket,
          detail: /déjà entièrement clôturé/.test(sortie)
            ? "déjà clôturé"
            : "ticket clôturé",
        }
      : {
          evenement: "echec",
          ticket,
          detail: `clôture : ${court(erreurs)}`,
        },
  );
  return { ok: code === 0, evenements };
}

/** Le ticket fait-il partie de ce que la boucle suit ? `candidats` : les numéros que la frontière
 * a retenus pour le mode (les sous-issues natives de la spec comprises). */
export function appartientALaSelection(mode, issue, candidats) {
  if (mode.type === "tous") return true;
  if (mode.type === "tickets") return mode.numeros.includes(issue.numero);
  return (
    candidats.has(issue.numero) ||
    specDepuisCorps(issue.corps)?.numero === mode.numero
  );
}

// --- Lecture du monde -------------------------------------------------------------------------

const ETIQUETTES_A_PART = [ETIQUETTE_QUESTION, ETIQUETTE_RENDU];
const LIMITE_ISSUES = 500;
const CHAMPS_ISSUE = "number,title,state,labels,body";
const ECHECS_CLOTURE_MAX = 3;

const json = (texte) => JSON.parse(texte);
const issueDepuisGh = (brute) => ({
  numero: brute.number,
  titre: brute.title,
  etat: brute.state,
  etiquettes: brute.labels.map((l) => l.name),
  corps: brute.body ?? "",
});

/** Les options de frontiere.mjs pour le mode de la boucle. */
const optionsFrontiere = (mode) =>
  ({
    spec: ["--spec", String(mode.numero)],
    tickets: ["--tickets", (mode.numeros ?? []).join(",")],
    tous: ["--tous"],
  })[mode.type];

export const libelleMode = (mode) =>
  ({
    spec: `spec #${mode.numero}`,
    tickets: `tickets ${(mode.numeros ?? []).map((n) => `#${n}`).join(", ")}`,
    tous: "tous les tickets ready-for-agent",
  })[mode.type];

/** La situation d'un tour, lue sur git, claude et GitHub. Les sessions se lisent avant le tracker :
 * une session vue `done` a posé ses labels avant, et la lecture du tracker qui suit les voit. */
async function lireSituation({ mode, valeurs, racine, env, home }) {
  const gh = (...args) => executer("gh", args, { env });
  const depot = valeurs.depot;

  const branche = executer("git", [
    "-C",
    racine,
    "branch",
    "--show-current",
  ]).trim();
  const sale =
    executer("git", ["-C", racine, "status", "--porcelain"]).trim() !== "";
  // La clôture met `develop` à jour dans le checkout principal : sur une autre branche, elle
  // échouerait à chaque ticket. L'arrêt dit pourquoi, plutôt que de rendre des tickets à tort.
  const detail = sale
    ? "modifications non commitées"
    : branche !== valeurs.brancheIntegration
      ? `sur « ${branche || "HEAD détachée"} », pas sur ${valeurs.brancheIntegration}`
      : null;
  if (detail) {
    return {
      checkoutPrincipalPropre: false,
      checkoutPrincipalDetail: detail,
      tickets: [],
      etat: { tickets: {} },
      sessions: [],
      prs: {},
      verdicts: {},
      frontiere: null,
    };
  }

  const sessions = json(executer("claude", ["agents", "--json", "--all"]));
  const etat = lireEtat(cheminsEtat({ home, projet: valeurs.projet }).fichier);

  const ouvertes = new Map(
    json(
      gh(
        "issue",
        "list",
        "--repo",
        depot,
        "--state",
        "open",
        "--limit",
        String(LIMITE_ISSUES),
        "--json",
        CHAMPS_ISSUE,
      ),
    )
      .map(issueDepuisGh)
      .map((i) => [i.numero, i]),
  );

  const lecture = await capturer(() =>
    frontiere([...optionsFrontiere(mode), "--json"]),
  );
  if (lecture.code !== 0) {
    throw new Error(`frontière : ${lecture.erreurs || lecture.sortie}`);
  }
  const resultatFrontiere = json(lecture.sortie);
  const candidats = new Set(resultatFrontiere.tickets.map((t) => t.numero));

  const enVol = Object.keys(etat.tickets).map(Number);
  const tickets = [];
  for (const numero of new Set([...candidats, ...enVol])) {
    let issue = ouvertes.get(numero);
    // Un candidat fermé qui n'est pas en vol n'a plus rien à faire ; un ticket en vol fermé reste à
    // clôturer (PR fusionnée à la main, ou clôture interrompue).
    if (!issue && !enVol.includes(numero)) continue;
    issue ??= issueDepuisGh(
      json(
        gh(
          "issue",
          "view",
          String(numero),
          "--repo",
          depot,
          "--json",
          CHAMPS_ISSUE,
        ),
      ),
    );
    if (!appartientALaSelection(mode, issue, candidats)) continue;
    tickets.push({
      numero,
      titre: issue.titre,
      etat: issue.etat,
      etiquettes: issue.etiquettes,
    });
  }

  const prs = {};
  const verdicts = {};
  for (const t of tickets) {
    const entree = etat.tickets[String(t.numero)];
    if (!entree) continue;
    const trouvees = json(
      gh(
        "pr",
        "list",
        "--repo",
        depot,
        "--head",
        brancheTicket(t.numero),
        "--state",
        "all",
        "--json",
        "number,state",
      ),
    );
    const retenue =
      trouvees.find((p) => p.state === "OPEN") ??
      trouvees
        .filter((p) => p.state === "MERGED")
        .sort((a, b) => b.number - a.number)[0] ??
      null;
    prs[t.numero] = retenue
      ? { numero: retenue.number, etat: retenue.state }
      : null;

    const aPart = t.etiquettes.some((e) => ETIQUETTES_A_PART.includes(e));
    if (
      retenue?.state === "OPEN" &&
      t.etat === "OPEN" &&
      !aPart &&
      etatDeSession(sessions, entree).terminee
    ) {
      verdicts[t.numero] = await verdictDeVerification(t.numero);
    }
  }

  return {
    checkoutPrincipalPropre: true,
    tickets,
    etat,
    sessions,
    prs,
    verdicts,
    frontiere: {
      aLancer: resultatFrontiere.aLancer,
      tickets: resultatFrontiere.tickets,
    },
  };
}

/** Le verdict de verifier-pr.mjs, appelé comme une fonction : il sort en 1 quand la PR n'est pas
 * fusionnable mais écrit son verdict JSON ; seule une sortie sans JSON est illisible. */
async function verdictDeVerification(ticket) {
  const lecture = await capturer(() => verifierPr([String(ticket), "--json"]));
  try {
    return json(lecture.sortie);
  } catch {
    return {
      fusionnable: false,
      raisons: [
        `vérification illisible : ${lecture.erreurs || lecture.sortie || "aucune sortie"}`,
      ],
    };
  }
}

// --- Exécution --------------------------------------------------------------------------------

const repetition = (ticket, lecture) => ({
  ok: true,
  evenements: [lecture.sortie, lecture.erreurs]
    .join("\n")
    .split("\n")
    .filter((ligne) => ligne.trim() !== "")
    .map((detail) => ({ evenement: "repetition", ticket, detail })),
});

/** Passe le ticket `ready-for-human` avec l'explication en commentaire, après avoir relu le tracker :
 * un label ou une PR apparus depuis la lecture du tour lèvent l'anomalie. */
async function rendreAuHumain(
  { ticket, explication },
  { valeurs, env, dryRun },
) {
  const gh = (...args) => executer("gh", args, { env });
  const depot = valeurs.depot;
  if (dryRun) {
    return {
      ok: true,
      evenements: [
        {
          evenement: "repetition",
          ticket,
          detail: `passerait le ticket ${ETIQUETTE_RENDU} : ${explication}`,
        },
      ],
    };
  }
  const etiquettes = json(
    gh("issue", "view", String(ticket), "--repo", depot, "--json", "labels"),
  ).labels.map((l) => l.name);
  const ouvertes = json(
    gh(
      "pr",
      "list",
      "--repo",
      depot,
      "--head",
      brancheTicket(ticket),
      "--state",
      "open",
      "--json",
      "number",
    ),
  );
  const levee = etiquettes.some((e) => ETIQUETTES_A_PART.includes(e))
    ? "un label est posé depuis la lecture du tour"
    : ouvertes.length > 0
      ? `la PR #${ouvertes[0].number} est ouverte depuis la lecture du tour`
      : null;
  if (levee) {
    return {
      ok: true,
      evenements: [
        { evenement: "anomalie", ticket, detail: `levée : ${levee}` },
      ],
    };
  }
  gh(
    "issue",
    "edit",
    String(ticket),
    "--repo",
    depot,
    "--add-label",
    ETIQUETTE_RENDU,
  );
  gh(
    "issue",
    "comment",
    String(ticket),
    "--repo",
    depot,
    "--body",
    `**Boucle de livraison** : ${explication}\n\nLe ticket est rendu (\`${ETIQUETTE_RENDU}\`) : le reprendre à la main, puis retirer le label.`,
  );
  return {
    ok: true,
    evenements: [{ evenement: "anomalie", ticket, detail: explication }],
  };
}

/** Fait une action du tour. `memoire.echecsCloture` compte les clôtures qui échouent d'affilée :
 * à la troisième, le ticket est rendu plutôt que réessayé (et commenté) à chaque tour. */
async function executerAction(action, { dryRun }, contexte) {
  const { ticket } = action;
  const options = { ...contexte, dryRun };
  switch (action.type) {
    case "attendre":
      return {
        ok: true,
        evenements: [{ evenement: "attente", ticket, detail: action.raison }],
      };
    case "lancer": {
      const args = [
        String(ticket),
        ...(action.enParallele.length > 0
          ? ["--en-parallele", action.enParallele.join(",")]
          : []),
        ...(dryRun ? ["--dry-run"] : []),
      ];
      const lecture = await capturer(() => lancer(args));
      if (dryRun) return repetition(ticket, lecture);
      const resultat = evenementsLancement({ ticket, ...lecture });
      if (!resultat.ok && resultat.pris) {
        // Assigné et « In Progress » mais sans session : plus aucun autre tour ne le reprendra.
        const rendu = await rendreAuHumain(
          {
            ticket,
            explication: `Le lancement de la session a échoué après la prise du ticket (assigné, « In Progress ») : ${court(lecture.erreurs)}`,
          },
          options,
        );
        resultat.evenements.push(...rendu.evenements);
      }
      return resultat;
    }
    case "cloturer": {
      const lecture = await capturer(() =>
        cloturer([String(ticket), ...(dryRun ? ["--dry-run"] : [])]),
      );
      if (dryRun) return repetition(ticket, lecture);
      const resultat = evenementsCloture({ ticket, ...lecture });
      const echecs = contexte.memoire.echecsCloture;
      if (resultat.ok) {
        echecs.delete(ticket);
      } else {
        echecs.set(ticket, (echecs.get(ticket) ?? 0) + 1);
        if (echecs.get(ticket) >= ECHECS_CLOTURE_MAX) {
          const rendu = await rendreAuHumain(
            {
              ticket,
              explication: `La clôture a échoué ${ECHECS_CLOTURE_MAX} fois de suite : ${court(lecture.erreurs)} Reprendre avec \`node scripts/orch/cloturer.mjs ${ticket}\`.`,
            },
            options,
          );
          resultat.evenements.push(...rendu.evenements);
          echecs.delete(ticket);
        }
      }
      return resultat;
    }
    case "rendreHumain":
      return rendreAuHumain(action, options);
    default:
      throw new Error(`Action inconnue : ${action.type}`);
  }
}

// --- Commande ---------------------------------------------------------------------------------

const USAGE =
  "Usage : node scripts/orch/boucle.mjs (--spec <n> | --tickets a,b,c | --tous) [--dry-run] [--etat <dossier>]";

/** Ctrl-C (ou SIGTERM) demande l'arrêt : la boucle finit l'action en cours puis s'arrête, les
 * sessions de fond continuent. Un deuxième signal sort tout de suite. */
function ecouterArret() {
  let arret = false;
  let reveil = null;
  const demander = () => {
    if (arret) process.exit(130);
    arret = true;
    reveil?.();
  };
  process.on("SIGINT", demander);
  process.on("SIGTERM", demander);
  return {
    arretDemande: () => arret,
    attendre: (ms) =>
      arret
        ? Promise.resolve()
        : new Promise((fin) => {
            const minuteur = setTimeout(fin, ms);
            reveil = () => {
              clearTimeout(minuteur);
              fin();
            };
          }),
  };
}

/** Les ports de la boucle sur le vrai monde : git, claude, GitHub, les scripts des tickets
 * précédents, le journal sur disque (sauf en répétition) et l'écran. */
export function portsReels({
  mode,
  valeurs,
  racine,
  env,
  home,
  dryRun,
  fichierJournal,
  signaux,
}) {
  const contexte = { valeurs, env, memoire: { echecsCloture: new Map() } };
  return {
    maintenant: () => new Date(),
    arretDemande: signaux.arretDemande,
    attendre: signaux.attendre,
    lireSituation: () => lireSituation({ mode, valeurs, racine, env, home }),
    executer: (action, opts) => executerAction(action, opts, contexte),
    journal: (ligne) => {
      process.stdout.write(`${ligne}\n`);
      if (!dryRun) {
        mkdirSync(dirname(fichierJournal), { recursive: true });
        appendFileSync(fichierJournal, `${ligne}\n`);
      }
    },
    afficher: (texte) => process.stdout.write(`${texte}\n`),
  };
}

export async function main(argv) {
  const { values: options } = parseArgs({
    args: argv,
    options: {
      spec: { type: "string" },
      tickets: { type: "string" },
      tous: { type: "boolean", default: false },
      "dry-run": { type: "boolean", default: false },
      etat: { type: "string" },
    },
  });
  const mode = modeDepuisOptions(options);
  if (!mode) {
    console.error(USAGE);
    return 1;
  }
  // Le dossier d'état d'un essai remplace l'état réel pour tous les scripts appelés.
  if (options.etat) process.env.ORCH_DOSSIER_ETAT = options.etat;

  const ici = dirname(fileURLToPath(import.meta.url));
  const sources = racineCheckoutCourant(ici);
  const racine = racineCheckoutPrincipal(ici);
  const valeurs = lireValeurs(sources);
  const home = homedir();
  const env = envGh(valeurs.compteGh);
  const dryRun = options["dry-run"];
  const dossier = cheminsEtat({ home, projet: valeurs.projet }).dossier;

  const fichierVerrou = join(dossier, "boucle.verrou.json");
  const fichierJournal = join(dossier, "boucle.log");
  if (!dryRun) {
    const verrou = prendreVerrou({
      fichier: fichierVerrou,
      pid: process.pid,
      mode: libelleMode(mode),
      maintenant: new Date(),
      pidVivant: (pid) => {
        try {
          process.kill(pid, 0);
          return true;
        } catch (erreur) {
          return erreur.code === "EPERM";
        }
      },
    });
    if (!verrou.ok) {
      console.error(verrou.raison);
      return 1;
    }
    if (verrou.raison) console.log(verrou.raison);
    process.on("exit", () =>
      rendreVerrou({ fichier: fichierVerrou, pid: process.pid }),
    );
  }

  const ports = portsReels({
    mode,
    valeurs,
    racine,
    env,
    home,
    dryRun,
    fichierJournal,
    signaux: ecouterArret(),
  });
  return boucle({
    ports,
    intervalleMs: valeurs.intervalleBoucleSecondes * 1000,
    libelleMode: libelleMode(mode),
    dryRun,
  });
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
