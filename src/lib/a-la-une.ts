import { estMiseDeCote } from "./decision-moderation";
import { estComplete } from "./inscription-activite";
import { ordreChronologique } from "./partage-activite";

type Candidate = {
  date_activite: string;
  heure_debut: string;
  statut?: string;
  capacite_max?: number | null;
  places_prises?: number;
};

/**
 * L'activité du bloc « À la une » de l'Accueil : la première activité à venir (jour, puis heure
 * de début) où l'on peut encore s'inscrire, donc ni annulée, ni masquée, ni en relecture, ni
 * complète ; `null` si aucune ne l'est. Une activité où le résident est déjà inscrit reste
 * éligible. `activites` sont les activités à venir du catalogue, dans n'importe quel ordre.
 */
export function activiteALaUne<T extends Candidate>(activites: T[]): T | null {
  const eligibles = activites.filter(
    (activite) =>
      activite.statut !== "annulee" &&
      !estMiseDeCote(activite.statut) &&
      !estComplete({
        capaciteMax: activite.capacite_max ?? null,
        placesPrises: activite.places_prises ?? 0,
      }),
  );
  return eligibles.sort(ordreChronologique)[0] ?? null;
}
