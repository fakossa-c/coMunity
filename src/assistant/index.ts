/**
 * Assistant de création d'activité.
 *
 * Reçoit une proposition et renvoie des suggestions (catégorie, pictogramme),
 * des avertissements et un avis de modération. Deux moteurs viendront s'y brancher :
 * le moteur de règles, toujours actif, et Jev, optionnel. Tant qu'aucun n'est
 * branché, l'assistant ne donne aucun avis et ne bloque jamais la publication.
 */

/** Identifiant d'une catégorie fixe (ex. « moments-partages »). */
export type IdentifiantCategorie = string;

/** Identifiant d'un pictogramme de la bibliothèque. */
export type IdentifiantPictogramme = string;

export type LieuProposition =
  { type: "residence"; idLieu: string } | { type: "libre"; libelle: string };

export type Proposition = {
  titre: string;
  description: string;
  categorie: IdentifiantCategorie | null;
  /** Date au format AAAA-MM-JJ. */
  date: string;
  /** Heures au format HH:MM. */
  heureDebut: string;
  heureFin: string;
  lieu: LieuProposition;
  /** `null` : pas de limite de participants. */
  capaciteMax: number | null;
};

export type Avertissement = {
  /** Un avertissement bloquant empêche la publication tant qu'il n'est pas corrigé. */
  bloquant: boolean;
  message: string;
};

export type AvisModeration =
  | { avis: "conforme" }
  | { avis: "a_relire"; raison: string }
  | { avis: "pas_d_avis" };

export type AvisAssistant = {
  categorieSuggeree: IdentifiantCategorie | null;
  pictogrammeSuggere: IdentifiantPictogramme | null;
  avertissements: Avertissement[];
  moderation: AvisModeration;
};

export async function analyserProposition(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- lue par les moteurs à venir
  proposition: Proposition,
): Promise<AvisAssistant> {
  return {
    categorieSuggeree: null,
    pictogrammeSuggere: null,
    avertissements: [],
    moderation: { avis: "pas_d_avis" },
  };
}
