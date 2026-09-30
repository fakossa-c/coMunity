/** Un retour sur une activité : la note et le commentaire d'un participant. */
export type Retour = { note: number; commentaire: string };

/** Ce que renvoie la RPC `retours_activite` : réservée à l'organisateur et au conseil syndical. */
export type RetoursActivite = {
  note_moyenne: number | null;
  nombre_retours: number;
  commentaires: Retour[];
};

/** « 3,5 / 5 », « 4 / 5 » sans décimale superflue, ou l'absence de retour. */
export function libelleNoteMoyenne(moyenne: number | null) {
  if (moyenne === null) return "Aucun avis pour l'instant";
  const arrondie = Math.round(moyenne * 10) / 10;
  return `${arrondie.toString().replace(".", ",")} / 5`;
}

/** « Aucun avis », « 1 avis », « 3 avis ». */
export function libelleNombreRetours(nombre: number) {
  if (nombre === 0) return "Aucun avis";
  return `${nombre} avis`;
}
