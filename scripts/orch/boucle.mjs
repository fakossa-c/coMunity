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
