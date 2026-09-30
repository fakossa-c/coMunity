/**
 * Assistant de création d'activité.
 *
 * Reçoit une proposition et renvoie des suggestions (catégorie, pictogramme),
 * des avertissements et un avis de modération. Deux moteurs s'y branchent : le moteur de
 * règles, toujours actif (ci-dessous), et Jev, optionnel, fourni par l'appelant. Sans Jev,
 * ou quand Jev est en erreur ou trop lent, l'assistant ne suggère rien et ne donne aucun avis
 * de modération : Jev ne bloque jamais la publication.
 */

import {
  categoriesActiviteListe,
  pictogrammesActivite,
} from "@/lib/categories-activite";
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

const AUCUNE_REGLE: ReglesResidence = {
  heureCalme: null,
  espacesCommuns: [],
  occupations: [],
};

export type RegleAssistant =
  | "heure_fin_max"
  | "capacite_espace"
  | "heure_calme"
  | "chevauchement"
  | "information_manquante";

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
      message: `L'espace commun « ${espace.nom} » ferme à ${limite} : finissez au plus tard à ${limite}.`,
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
      message: `L'espace commun « ${espace.nom} » accueille ${espace.capacite} personnes au plus : limitez les places à ${espace.capacite}.`,
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
          message: `« ${autre.titre} » occupe déjà l'espace commun « ${espace.nom} » ce jour-là, ${creneau(autre.heureDebut, autre.heureFin)}.`,
        });
      }
    }
  }

  if (regles.heureCalme && fin > hhmm(regles.heureCalme)) {
    avertissements.push({
      regle: "heure_calme",
      bloquant: false,
      message: `Votre activité finit après ${heure(regles.heureCalme)}, l'heure de calme de la résidence : pensez aux voisins.`,
    });
  }

  return avertissements;
}

/** Ce que l'assistant envoie à Jev : le titre, la description et le créneau, jamais rien de personnel. */
export type EntreeJev = {
  titre: string;
  description: string;
  /** Date au format AAAA-MM-JJ. */
  date: string;
  heureDebut: string;
  heureFin: string;
};

/** Un choix de Jev et sa confiance, de 0 à 1. */
export type ChoixJev = { valeur: string; confiance: number };

/** Ce que Jev répond ; l'assistant n'en retient que ce qui passe ses seuils de confiance. */
export type ReponseJev = {
  categorie: ChoixJev | null;
  pictogramme: ChoixJev | null;
  /** Les informations importantes qui semblent manquer, en une phrase chacune. */
  informationsManquantes: string[];
  /** Le verdict de conformité aux règles de bon voisinage ; `null` sans avis. */
  conformite: { conforme: boolean; raison: string; confiance: number } | null;
};

/** Le moteur Jev : interrogé côté serveur, il abandonne quand `signal` est coupé. */
export type MoteurJev = (
  entree: EntreeJev,
  signal: AbortSignal,
) => Promise<ReponseJev>;

export type OptionsAnalyse = {
  jev?: MoteurJev;
  /** Au-delà, l'assistant renonce à Jev. */
  delaiJevMs?: number;
};

/** Confiance minimale pour appliquer une suggestion de catégorie ou de pictogramme. */
export const SEUIL_SUGGESTION = 0.6;

/** Confiance minimale pour mettre une proposition en relecture, ou la dire conforme. */
export const SEUIL_MODERATION = 0.8;

/** Au-delà de ce délai, l'assistant renonce à Jev plutôt que de faire attendre l'organisateur. */
export const DELAI_JEV_MS = 3000;

const MAX_INFORMATIONS_MANQUANTES = 3;

const RAISON_PAR_DEFAUT =
  "L'assistant juge cette proposition contraire aux règles de bon voisinage.";

/** Interroge Jev ; `null` sur erreur, réponse illisible ou dépassement du délai. */
async function interrogerJev(
  jev: MoteurJev,
  entree: EntreeJev,
  delaiMs: number,
): Promise<ReponseJev | null> {
  const coupure = new AbortController();
  let minuteur: ReturnType<typeof setTimeout> | undefined;
  const delai = new Promise<null>((resoudre) => {
    minuteur = setTimeout(() => {
      coupure.abort();
      resoudre(null);
    }, delaiMs);
  });
  try {
    return await Promise.race([
      jev(entree, coupure.signal).catch((erreur: unknown) => {
        // Sans effet pour le créateur, mais dit pourquoi Jev n'a pas donné d'avis.
        console.warn(
          "Jev sans avis :",
          erreur instanceof Error ? erreur.message : erreur,
        );
        return null;
      }),
      delai,
    ]);
  } finally {
    clearTimeout(minuteur);
  }
}

function confianceValide(confiance: unknown): confiance is number {
  return typeof confiance === "number" && confiance >= 0 && confiance <= 1;
}

/** La valeur d'un choix de Jev quand elle est connue et assez sûre, sinon `null`. */
function choisir(
  choix: ChoixJev | null | undefined,
  connues: readonly string[],
): string | null {
  if (
    !choix ||
    !confianceValide(choix.confiance) ||
    choix.confiance < SEUIL_SUGGESTION
  )
    return null;
  return connues.includes(choix.valeur) ? choix.valeur : null;
}

function informationsManquantes(reponse: ReponseJev): Avertissement[] {
  if (!Array.isArray(reponse.informationsManquantes)) return [];
  return reponse.informationsManquantes
    .filter((phrase): phrase is string => typeof phrase === "string")
    .map((phrase) => phrase.trim())
    .filter((phrase) => phrase.length > 0)
    .slice(0, MAX_INFORMATIONS_MANQUANTES)
    .map((message) => ({
      regle: "information_manquante",
      bloquant: false,
      message,
    }));
}

function moderationDe(reponse: ReponseJev): AvisModeration {
  const verdict = reponse.conformite;
  if (
    !verdict ||
    !confianceValide(verdict.confiance) ||
    verdict.confiance < SEUIL_MODERATION
  )
    return { avis: "pas_d_avis" };
  if (verdict.conforme) return { avis: "conforme" };
  const raison =
    typeof verdict.raison === "string" ? verdict.raison.trim() : "";
  return { avis: "a_relire", raison: raison || RAISON_PAR_DEFAUT };
}

export async function analyserProposition(
  proposition: Proposition,
  regles: ReglesResidence = AUCUNE_REGLE,
  { jev, delaiJevMs = DELAI_JEV_MS }: OptionsAnalyse = {},
): Promise<AvisAssistant> {
  const avertissements = appliquerRegles(proposition, regles);
  const reponse = jev
    ? await interrogerJev(
        jev,
        {
          titre: proposition.titre,
          description: proposition.description,
          date: proposition.date,
          heureDebut: proposition.heureDebut,
          heureFin: proposition.heureFin,
        },
        delaiJevMs,
      )
    : null;
  if (!reponse || typeof reponse !== "object")
    return {
      categorieSuggeree: null,
      pictogrammeSuggere: null,
      avertissements,
      moderation: { avis: "pas_d_avis" },
    };

  return {
    categorieSuggeree: choisir(reponse.categorie, categoriesActiviteListe),
    pictogrammeSuggere: choisir(reponse.pictogramme, pictogrammesActivite),
    avertissements: [...avertissements, ...informationsManquantes(reponse)],
    moderation: moderationDe(reponse),
  };
}
