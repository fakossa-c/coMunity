// La boucle de livraison (spec #208, ticket #216).

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
    const session = sessionDuTicket(sessions, entree);
    const etatSession = session?.state ?? "introuvable";
    const terminee =
      ETATS_SESSION_FINIE.includes(etatSession) ||
      etatSession === "introuvable";
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
        raison:
          "Le checkout principal a des modifications non commitées : la boucle s'arrête. Les sessions en cours continuent ; relancer la boucle une fois le checkout nettoyé.",
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
