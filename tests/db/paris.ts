// L'heure et le jour de la résidence (Europe/Paris) pour les tests base, et de quoi simuler la
// nuit où le jour d'UTC n'est pas encore celui de Paris, quelle que soit l'heure du test.

const HORLOGE_PARIS = new Intl.DateTimeFormat("sv-SE", {
  timeZone: "Europe/Paris",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

/** Le jour `AAAA-MM-JJ` de Paris, décalé de `jours` (négatif : passé) par rapport à aujourd'hui. */
export function jourParis(jours = 0) {
  return HORLOGE_PARIS.format(new Date(Date.now() + jours * 86_400_000)).slice(
    0,
    10,
  );
}

/**
 * Un créneau du jour de Paris qui se termine à `minutes` de maintenant (négatif : déjà terminé),
 * écrit à l'heure murale de Paris : date et heure viennent du même instant, donc le créneau
 * franchit minuit sans que le test dépende de l'heure où il tourne.
 */
export function creneauFinissantDans(minutes: number) {
  let instant = Date.now() + minutes * 60_000;
  let [date_activite, heure_fin] = HORLOGE_PARIS.format(
    new Date(instant),
  ).split(" ");
  // Une fin à minuit pile n'aurait aucun début possible avant elle.
  if (heure_fin === "00:00") {
    instant += 60_000;
    [date_activite, heure_fin] = HORLOGE_PARIS.format(new Date(instant)).split(
      " ",
    );
  }
  return { date_activite, heure_debut: "00:00", heure_fin };
}

/**
 * Un fuseau où le jour n'est pas celui de Paris en ce moment. La base compare alors à
 * `current_date` selon le fuseau de la session : demandé à PostgREST par
 * `Prefer: timezone=…`, il reproduit, à n'importe quelle heure, la nuit où la session (UTC) est
 * encore la veille de Paris. Les deux fuseaux couvrent toutes les heures : l'un est 12 à 13 h
 * derrière Paris, l'autre 11 à 12 h devant.
 */
export function fuseauDecale() {
  const jourDeParis = jourParis(0);
  const fuseau = ["Pacific/Pago_Pago", "Pacific/Kiritimati"].find(
    (candidat) =>
      new Intl.DateTimeFormat("sv-SE", { timeZone: candidat }).format(
        new Date(),
      ) !== jourDeParis,
  );
  if (!fuseau) throw new Error("Aucun fuseau décalé par rapport à Paris");
  return fuseau;
}

/** La requête PostgREST, exécutée dans une session de la base réglée sur `fuseau` (sans `fuseau`, inchangée). */
export function avecFuseau<
  T extends { setHeader(nom: string, valeur: string): T },
>(requete: T, fuseau?: string): T {
  return fuseau ? requete.setHeader("Prefer", `timezone=${fuseau}`) : requete;
}
