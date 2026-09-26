/**
 * Assistant de création d'activité.
 *
 * Reçoit une proposition et renvoie des suggestions (catégorie, pictogramme),
 * des avertissements et un avis de modération. Deux moteurs s'y branchent : le moteur de
 * règles, toujours actif (ci-dessous), et Jev, optionnel, pas encore branché. Tant que Jev
 * ne l'est pas, l'assistant ne suggère rien et ne donne aucun avis de modération.
 */

import { creneau, heure } from "@/lib/partage-activite";

/** Identifiant d'une catégorie fixe (ex. « moments-partages »). */
export type IdentifiantCategorie = string;

/** Identifiant d'un pictogramme de la bibliothèque. */
export type IdentifiantPictogramme = string;

/** Un espace commun de la résidence, ou un lieu libre saisi par le créateur (« Autre »). */
export type LieuProposition =
  | { type: "espace_commun"; idEspace: string }
  | { type: "libre"; libelle: string };

export type Proposition = {
  titre: string;
  description: string;
  categorie: IdentifiantCategorie | null;
  /** Date au format AAAA-MM-JJ. */
  date: string;
  /** Heures au format HH:MM (les secondes éventuelles sont ignorées). */
  heureDebut: string;
  heureFin: string;
  lieu: LieuProposition;
  /** `null` : pas de limite de participants. */
  capaciteMax: number | null;
};

/** Ce que le moteur de règles sait d'un espace commun. */
export type EspaceCommunRegles = {
  id: string;
  nom: string;
  /** `null` : pas de capacité fixée. */
  capacite: number | null;
  /** Heure à laquelle toute activité doit être finie ; `null` : pas d'heure limite. */
  heureFinMax: string | null;
};

/** Une activité publiée dans un espace commun, qui l'occupe sur son créneau. */
export type Occupation = {
  titre: string;
  idEspace: string;
  date: string;
  heureDebut: string;
  heureFin: string;
};

/** Les règles de la résidence fixées par le conseil syndical, que le moteur applique. */
export type ReglesResidence = {
  /** Heure à partir de laquelle une activité dérange ; `null` : pas d'heure de calme. */
  heureCalme: string | null;
  espacesCommuns: EspaceCommunRegles[];
  /** Les activités publiées dans les espaces communs, hors celle qu'on modifie. */
  occupations: Occupation[];
};

export const AUCUNE_REGLE: ReglesResidence = {
  heureCalme: null,
  espacesCommuns: [],
  occupations: [],
};

export type RegleAssistant =
  "heure_fin_max" | "capacite_espace" | "heure_calme" | "chevauchement";

export type Avertissement = {
  /** La règle enfreinte : elle dit à quelle étape du parcours revenir. */
  regle: RegleAssistant;
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

/** « 16:00:00 » et « 16:00 » se comparent comme « 16:00 ». */
function hhmm(valeur: string) {
  return valeur.slice(0, 5);
}

/** Le moteur de règles : les règles des espaces communs, puis l'heure de calme. */
function appliquerRegles(
  proposition: Proposition,
  regles: ReglesResidence,
): Avertissement[] {
  const avertissements: Avertissement[] = [];
  const fin = hhmm(proposition.heureFin);
  const { lieu } = proposition;
  // Un lieu libre, ou un espace qui n'existe plus, n'a pas de règles d'espace commun.
  const espace =
    lieu.type === "espace_commun"
      ? regles.espacesCommuns.find((e) => e.id === lieu.idEspace)
      : undefined;

  if (espace?.heureFinMax && fin > hhmm(espace.heureFinMax)) {
    const limite = heure(espace.heureFinMax);
    avertissements.push({
      regle: "heure_fin_max",
      bloquant: true,
      message: `L'espace « ${espace.nom} » ferme à ${limite} : finissez au plus tard à ${limite}.`,
    });
  }

  if (
    espace?.capacite != null &&
    (proposition.capaciteMax === null ||
      proposition.capaciteMax > espace.capacite)
  ) {
    avertissements.push({
      regle: "capacite_espace",
      bloquant: true,
      message: `L'espace « ${espace.nom} » accueille ${espace.capacite} personnes au plus : limitez les places à ${espace.capacite}.`,
    });
  }

  if (espace) {
    const debut = hhmm(proposition.heureDebut);
    for (const autre of regles.occupations) {
      const chevauche =
        autre.idEspace === espace.id &&
        autre.date === proposition.date &&
        debut < hhmm(autre.heureFin) &&
        hhmm(autre.heureDebut) < fin;
      if (chevauche) {
        avertissements.push({
          regle: "chevauchement",
          bloquant: false,
          message: `« ${autre.titre} » occupe déjà l'espace « ${espace.nom} » ce jour-là, ${creneau(autre.heureDebut, autre.heureFin)}.`,
        });
      }
    }
  }

  if (regles.heureCalme && fin > hhmm(regles.heureCalme)) {
    avertissements.push({
      regle: "heure_calme",
      bloquant: false,
      message: `Votre activité finit après ${heure(regles.heureCalme)}, l'heure de calme de la résidence : pensez aux voisins.`,
    });
  }

  return avertissements;
}

export async function analyserProposition(
  proposition: Proposition,
  regles: ReglesResidence = AUCUNE_REGLE,
): Promise<AvisAssistant> {
  return {
    categorieSuggeree: null,
    pictogrammeSuggere: null,
    avertissements: appliquerRegles(proposition, regles),
    moderation: { avis: "pas_d_avis" },
  };
}

/** Vrai si l'un des avertissements empêche la publication. */
export function estBloquant(avertissements: Avertissement[]) {
  return avertissements.some((a) => a.bloquant);
}
