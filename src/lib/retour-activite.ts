/** Un retour sur une activité : la note et le commentaire d'un participant. */
export type Retour = { note: number; commentaire: string };

/** Ce que renvoie la RPC `retours_activite` : réservée à l'organisateur et au conseil syndical. */
export type RetoursActivite = {
  note_moyenne: number | null;
  nombre_retours: number;
  commentaires: Retour[];
};

/** Ce qu'il faut d'une activité pour savoir si elle est terminée. */
export type EcheanceActivite = { date_activite: string; heure_fin: string };

/** Vrai quand la date et l'heure de fin de l'activité sont dans le passé. */
export function activiteEstPassee({
  date_activite,
  heure_fin,
}: EcheanceActivite) {
  return new Date(`${date_activite}T${heure_fin}`) < new Date();
}

/** « 3,5 / 5 », « 4 / 5 » sans décimale superflue, ou l'absence de retour. */
export function libelleNoteMoyenne(moyenne: number | null) {
  if (moyenne === null) return "Aucun retour pour le moment";
  const arrondie = Math.round(moyenne * 10) / 10;
  return `${arrondie.toString().replace(".", ",")} / 5`;
}

/** « Aucun retour », « 1 retour », « 3 retours ». */
export function libelleNombreRetours(nombre: number) {
  if (nombre === 0) return "Aucun retour";
  return nombre === 1 ? "1 retour" : `${nombre} retours`;
}
