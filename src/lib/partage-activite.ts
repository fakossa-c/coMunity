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

/** « Samedi 24 octobre », pour une date `AAAA-MM-JJ`. */
export function jourLong(date: string) {
  const jour = FORMAT_JOUR.format(new Date(`${date}T00:00:00Z`));
  return jour.charAt(0).toUpperCase() + jour.slice(1);
}

/** « 16h00 », pour une heure `HH:MM` ou `HH:MM:SS`. */
function heure(valeur: string) {
  const [heures, minutes] = valeur.split(":");
  return `${Number(heures)}h${minutes}`;
}

/** « de 16h00 à 18h30 ». */
export function creneau(debut: string, fin: string) {
  return `de ${heure(debut)} à ${heure(fin)}`;
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
