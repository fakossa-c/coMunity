/** Ce qu'il faut d'une activité pour l'annoncer hors de l'app. */
export type ActivitePartagee = {
  titre: string;
  pictogramme: string;
  date_activite: string;
  heure_debut: string;
  heure_fin: string;
  lieu: string;
  /** Absent tant que l'activité n'a pas de jauge. */
  placesRestantes?: number | null;
};

/** Le fuseau du jour de référence : celui de la résidence, fixe pour toute l'application. */
export const FUSEAU_REFERENCE = "Europe/Paris";

const HORLOGE_REFERENCE = new Intl.DateTimeFormat("sv-SE", {
  timeZone: FUSEAU_REFERENCE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

/** L'heure murale de Paris à cet instant, `AAAA-MM-JJ HH:MM:SS` : comparable telle quelle. */
function horlogeDeReference(maintenant: Date) {
  return HORLOGE_REFERENCE.format(maintenant);
}

/**
 * La date du jour, `AAAA-MM-JJ`, en Europe/Paris. C'est le jour de la base
 * (`jour_reference()`) : l'Accueil, les activités et les listes comparent tous leurs dates à ce
 * même jour, jamais à celui d'UTC.
 */
export function aujourdhui(maintenant = new Date()) {
  return horlogeDeReference(maintenant).slice(0, 10);
}

/**
 * Vrai quand l'activité est terminée : sa date et son heure de fin sont derrière l'heure de
 * Paris. Le jour même, elle est à venir jusqu'à son heure de fin, puis passée. Même règle que
 * `activite_est_passee` en base.
 */
export function estPassee(
  { date_activite, heure_fin }: { date_activite: string; heure_fin: string },
  maintenant = new Date(),
) {
  const fin = heure_fin.length === 5 ? `${heure_fin}:00` : heure_fin;
  return `${date_activite} ${fin}` < horlogeDeReference(maintenant);
}

/** Ordre chronologique de deux activités : jour, puis heure de début. */
export function ordreChronologique(
  a: { date_activite: string; heure_debut: string },
  b: { date_activite: string; heure_debut: string },
) {
  return `${a.date_activite} ${a.heure_debut}`.localeCompare(
    `${b.date_activite} ${b.heure_debut}`,
  );
}

/** Chemin de la fiche d'une activité, celui du lien partagé. */
export function cheminFiche(identifiant: string) {
  return `/activites/${identifiant}`;
}

/**
 * Équivalent emoji d'un pictogramme, pour le message partagé. L'interface n'en emploie pas ;
 * seul l'aperçu du message, sur l'écran qui suit la publication, les montre tels qu'ils partiront.
 */
const emojis: Record<string, string> = {
  waving_hand: "👋",
  handyman: "🛠️",
  menu_book: "📚",
  handshake: "🤝",
  potted_plant: "🪴",
};

const FORMAT_JOUR = new Intl.DateTimeFormat("fr-FR", {
  weekday: "long",
  day: "numeric",
  month: "long",
  timeZone: "UTC",
});

export function majusculeInitiale(texte: string) {
  return texte.charAt(0).toUpperCase() + texte.slice(1);
}

/** « Samedi 24 octobre », pour une date `AAAA-MM-JJ`. */
export function jourLong(date: string) {
  return majusculeInitiale(FORMAT_JOUR.format(new Date(`${date}T00:00:00Z`)));
}

/** « 16h00 », pour une heure `HH:MM` ou `HH:MM:SS`. */
export function heure(valeur: string) {
  const [heures, minutes] = valeur.split(":");
  return `${Number(heures)}h${minutes}`;
}

/** « de 16h00 à 18h30 ». */
export function creneau(debut: string, fin: string) {
  return `de ${heure(debut)} à ${heure(fin)}`;
}

/** « De 16h00 à 18h30 » : le créneau en début de ligne, sur une carte. */
export function horaire(debut: string, fin: string) {
  return majusculeInitiale(creneau(debut, fin));
}

/** « 4 places restantes », « 1 place restante » ou « Complet ». */
export function placesRestantes(nombre: number) {
  if (nombre <= 0) return "Complet";
  return nombre === 1 ? "1 place restante" : `${nombre} places restantes`;
}

/** Le message à coller dans le groupe WhatsApp de la résidence. */
export function messageWhatsApp(activite: ActivitePartagee, lien: string) {
  const emoji = emojis[activite.pictogramme];
  const lignes = [
    emoji ? `${emoji} ${activite.titre}` : activite.titre,
    `📅 ${jourLong(activite.date_activite)}, ${creneau(activite.heure_debut, activite.heure_fin)}`,
    `📍 ${activite.lieu}`,
  ];
  if (activite.placesRestantes != null) {
    lignes.push(placesRestantes(activite.placesRestantes));
  }
  lignes.push(lien);
  return lignes.join("\n");
}

/** Lien qui ouvre WhatsApp avec `message` pré-rempli, sur téléphone comme sur ordinateur. */
export function lienWhatsApp(message: string) {
  return `https://wa.me/?text=${encodeURIComponent(message)}`;
}
