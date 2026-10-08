import { jourDecale } from "../../src/lib/calendrier";
import { aujourdhui } from "../../src/lib/partage-activite";

/**
 * Le jour `AAAA-MM-JJ` dans `decalage` jours (négatif : dans le passé), compté depuis le jour de
 * la résidence, celui d'Europe/Paris. Toute date qu'un test fabrique passe par là : un calcul sur
 * `toISOString()` donne le jour d'UTC, qui retarde d'un jour entre minuit et 2h à Paris, alors que
 * l'application et la base raisonnent au jour de Paris (ticket #86).
 */
export function jourDeParis(decalage = 0, maintenant = new Date()) {
  return jourDecale(aujourdhui(maintenant), decalage);
}
