import { estPassee, ordreChronologique } from "./partage-activite";

type Classable = {
  id: string;
  date_activite: string;
  heure_debut: string;
  statut?: string;
};

/** Le rôle du résident dans une activité archivée : il l'a organisée, ou il y avait une place. */
export type RoleArchive = "organisee" | "suivie";

export type ActiviteArchivee<T> = { activite: T; role: RoleArchive };

/**
 * Les trois segments de l'écran Activités.
 * - Je participe : les inscriptions à venir (le jour même compris), annulées par leur créateur
 *   comprises pour qu'on le lise, la plus proche d'abord.
 * - J'organise : les activités organisées à venir, annulées comprises, la plus proche d'abord.
 * - Archivées : toutes les activités passées, organisées ou suivies, la plus récente d'abord. Une
 *   activité organisée où l'on était aussi inscrit compte une fois, en organisée. Une activité
 *   suivie puis annulée n'y figure pas (on n'y est pas allé) ; une organisée puis annulée y reste.
 *
 * `inscriptions` et `organisees` couvrent le passé comme l'avenir ; le jour de référence les
 * partage.
 */
export function classerMesActivites<T extends Classable>({
  inscriptions,
  organisees,
  jour,
}: {
  inscriptions: T[];
  organisees: T[];
  jour: string;
}) {
  const aVenir = (activite: T) => !estPassee(activite.date_activite, jour);
  const plusRecenteDAbord = (a: ActiviteArchivee<T>, b: ActiviteArchivee<T>) =>
    ordreChronologique(b.activite, a.activite);

  const organiseesArchivees = organisees
    .filter((activite) => !aVenir(activite))
    .map((activite): ActiviteArchivee<T> => ({ activite, role: "organisee" }));
  const dejaOrganisees = new Set(organisees.map((activite) => activite.id));
  const suivies = inscriptions
    .filter(
      (activite) =>
        !aVenir(activite) &&
        activite.statut !== "annulee" &&
        !dejaOrganisees.has(activite.id),
    )
    .map((activite): ActiviteArchivee<T> => ({ activite, role: "suivie" }));

  return {
    jeParticipe: inscriptions.filter(aVenir).sort(ordreChronologique),
    jOrganise: organisees.filter(aVenir).sort(ordreChronologique),
    archivees: [...organiseesArchivees, ...suivies].sort(plusRecenteDAbord),
  };
}
