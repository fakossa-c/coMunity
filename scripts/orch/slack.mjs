// Notifications Slack de la boucle de livraison (spec #239, ticket #240) : ce qui se dit dans le
// canal et comment. Les fonctions de décision et de formatage sont pures ; `envoyerSlack` touche
// le réseau et reste mince. La boucle n'en dépend que par son port `notifier`, absent quand la
// machine n'a pas de webhook (`webhookSlack` du fichier de valeurs local, jamais versionné).

/** Au-delà, une citation (question, explication) est coupée : un message se lit sur un téléphone. */
export const LONGUEUR_CITATION_MAX = 1500;
const DELAI_ENVOI_MS = 10_000;
const SIGNATURE_BOUCLE = /^\*\*Boucle de livraison\*\*\s*:\s*/;

// --- Décision ---------------------------------------------------------------------------------

const titreDe = (titres, ticket) => titres?.[ticket] ?? "";

/** La notification que vaut une ligne de journal, ou null quand elle ne se dit pas dans Slack.
 * `action` est l'action qui a produit la ligne (sa PR pour une clôture), `titres` les titres des
 * tickets suivis. Une anomalie est presque toujours un ticket que la boucle rend : elle s'annonce
 * comme tel ; une anomalie levée (label ou PR apparus entre-temps) reste une anomalie. */
export function notificationDEvenement(
  { evenement, ticket, detail },
  { action, titres } = {},
) {
  const titre = titreDe(titres, ticket);
  switch (evenement) {
    case "lancement":
    case "echec":
      return { type: evenement, ticket, titre, detail };
    case "cloture":
      if (detail === "déjà clôturé") return null;
      return { type: "cloture", ticket, titre, pr: action?.pr ?? null };
    case "anomalie":
      return /^levée\b/.test(detail)
        ? { type: "anomalie", ticket, titre, detail }
        : { type: "rendu", ticket, titre, explication: detail };
    case "erreur":
    case "arret":
      return { type: evenement, detail };
    default:
      return null;
  }
}

const nouveaux = (courants, precedents) =>
  courants.filter((c) => !precedents.some((p) => p.ticket === c.ticket));

/** Les notifications que vaut le rapport d'un tour, comparé au précédent. Au premier tour, un
 * récapitulatif de ce qui attend déjà, sans annonce ticket par ticket. Ensuite, chaque ticket qui
 * apparaît en attente de réponse (sa question lue par `questionDe`) ou rendu (son explication lue
 * par `explicationDe`), sauf les tickets rendus que la boucle a déjà annoncés (`dejaAnnonces`). */
export function notificationsDuRapport({
  rapport,
  precedent,
  libelleMode,
  dejaAnnonces = new Set(),
  questionDe = () => null,
  explicationDe = () => null,
}) {
  if (!precedent) {
    return [
      {
        type: "demarrage",
        mode: libelleMode,
        enAttenteDeReponse: rapport.enAttenteDeReponse,
        rendus: rapport.rendus,
      },
    ];
  }
  const questions = nouveaux(
    rapport.enAttenteDeReponse,
    precedent.enAttenteDeReponse,
  ).map(({ ticket, titre }) => ({
    type: "question",
    ticket,
    titre,
    question: questionDe(ticket),
    gele: rapport.gels.find((g) => g.ticket === ticket) ?? null,
  }));
  const rendus = nouveaux(rapport.rendus, precedent.rendus)
    .filter((r) => !dejaAnnonces.has(r.ticket))
    .map(({ ticket, titre }) => ({
      type: "rendu",
      ticket,
      titre,
      explication: explicationDe(ticket),
    }));
  return [...questions, ...rendus];
}

// --- Formatage (mrkdwn Slack) -----------------------------------------------------------------

// Slack lit `&`, `<` et `>` comme du balisage : un titre ou une question les échappe.
const echapper = (texte) =>
  String(texte ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");

const lienTicket = ({ ticket, titre, url }, depot) =>
  `<${url ?? `https://github.com/${depot}/issues/${ticket}`}|#${ticket}${titre ? ` ${echapper(titre)}` : ""}>`;
const lienPr = (pr, depot) =>
  `<https://github.com/${depot}/pull/${pr}|PR #${pr}>`;
const liste = (entrees, depot) =>
  entrees.map((e) => lienTicket(e, depot)).join(", ");

/** Un commentaire en citation : sans la signature de la boucle, coupé au-delà de la longueur
 * maximale, chaque ligne derrière `>`. */
function citer(texte) {
  let corps = String(texte ?? "")
    .replace(SIGNATURE_BOUCLE, "")
    .trim();
  if (corps.length > LONGUEUR_CITATION_MAX) {
    corps = `${corps.slice(0, LONGUEUR_CITATION_MAX)}…`;
  }
  return echapper(corps)
    .split(/\r?\n/)
    .map((ligne) => `> ${ligne}`)
    .join("\n");
}

/** Le texte Slack d'une notification : une ligne d'en-tête avec le ticket en lien (numéro en
 * clair, pour qu'un lecteur ou un workflow le retrouve), puis la citation s'il y en a une. */
export function texteSlack(notification, { depot, projet } = {}) {
  const n = notification;
  switch (n.type) {
    case "demarrage": {
      const lignes = [`▶️ Boucle de livraison lancée (${n.mode}).`];
      if (n.enAttenteDeReponse.length === 0 && n.rendus.length === 0) {
        lignes.push("Rien n'attend votre réponse.");
      }
      if (n.enAttenteDeReponse.length > 0) {
        lignes.push(
          `En attente de votre réponse : ${liste(n.enAttenteDeReponse, depot)}`,
        );
      }
      if (n.rendus.length > 0) {
        lignes.push(`Rendus (ready-for-human) : ${liste(n.rendus, depot)}`);
      }
      return lignes.join("\n");
    }
    case "lancement":
      return `🚀 ${lienTicket(n, depot)} : ${echapper(n.detail)}`;
    case "question": {
      const q = n.question;
      const entete = `❓ Question de la session sur ${lienTicket({ ...n, url: q?.url }, depot)}${q ? ` (portée ${q.portee})` : ""}`;
      const gel = n.gele
        ? `\n⏸️ Lancements ${n.gele.spec === null ? "des tickets sans spec" : `de la spec #${n.gele.spec}`} gelés jusqu'à votre réponse.`
        : "";
      const corps = q
        ? citer(q.corps)
        : "_Question introuvable dans les commentaires : lire le ticket._";
      return `${entete}${gel}\n${corps}`;
    }
    case "rendu":
      return `✋ Ticket rendu (ready-for-human) : ${lienTicket(n, depot)}\n${
        n.explication
          ? citer(n.explication)
          : "_Explication introuvable dans les commentaires : lire le ticket._"
      }`;
    case "cloture":
      return `✅ ${lienTicket(n, depot)} clos${n.pr ? `, ${lienPr(n.pr, depot)} fusionnée` : ""}.`;
    case "echec":
      return `⚠️ Échec sur ${lienTicket(n, depot)} : ${echapper(n.detail)}`;
    case "anomalie":
      return `⚠️ Anomalie sur ${lienTicket(n, depot)} : ${echapper(n.detail)}`;
    case "erreur":
      return `⚠️ Erreur de la boucle : ${echapper(n.detail)}`;
    case "arret":
      return `⏹️ Boucle arrêtée : ${echapper(n.detail)}`;
    case "essai":
      return `🔔 Essai : la boucle de livraison de ${projet ?? depot} postera ici.`;
    default:
      throw new Error(`Notification inconnue : ${n.type}`);
  }
}

// --- Envoi ------------------------------------------------------------------------------------

/** Poste `texte` sur le webhook. Rend { ok: true } ou { ok: false, raison } ; la raison ne contient
 * jamais l'URL (un secret), et rien n'est levé : Slack est un confort, pas une dépendance. */
export async function envoyerSlack({
  url,
  texte,
  fetchFn = globalThis.fetch,
  delaiMs = DELAI_ENVOI_MS,
}) {
  const sansUrl = (message) => String(message).replaceAll(url, "<webhook>");
  try {
    const reponse = await fetchFn(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text: texte }),
      signal: AbortSignal.timeout(delaiMs),
    });
    if (reponse.ok) return { ok: true };
    const corps = await reponse.text().catch(() => "");
    return {
      ok: false,
      raison: sansUrl(
        `réponse ${reponse.status}${corps ? ` ${corps.slice(0, 200)}` : ""}`,
      ),
    };
  } catch (erreur) {
    return { ok: false, raison: sansUrl(erreur?.message ?? erreur) };
  }
}
