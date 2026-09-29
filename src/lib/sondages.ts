import { dateSansJour } from "./annonces";
import { aujourdhui } from "./partage-activite";
import type { ErreurFormulaire } from "./resultat";

/** Un sondage tel que la table `sondage` le livre. `options` suit l'ordre d'affichage. */
export type Sondage = {
  id: string;
  question: string;
  options: string[];
  /** `AAAA-MM-JJ`, dernier jour où l'on répond. */
  echeance: string;
};

/** Les colonnes à lire pour un `Sondage`, avec `annonce_id` pour le rattacher à sa carte. */
export const COLONNES_SONDAGE = "id, annonce_id, question, options, echeance";

/** Les mêmes limites que les contraintes en base. */
export const LIMITES_SONDAGE = {
  question: 200,
  option: 100,
  optionsMin: 2,
  optionsMax: 6,
} as const;

/** Ce que le conseil syndical saisit : une ligne de `options` par option, vides comprises. */
export type SaisieSondage = {
  question: string;
  options: string[];
  /** `AAAA-MM-JJ`, ou vide. */
  echeance: string;
};

export type ChampSondage = "question" | "options" | "echeance";

export const SAISIE_SONDAGE_VIDE: SaisieSondage = {
  question: "",
  options: ["", ""],
  echeance: "",
};

/** Les options retenues : nettoyées, les lignes vides retirées. */
function optionsRetenues(saisie: SaisieSondage) {
  return saisie.options.map((o) => o.trim()).filter((o) => o.length > 0);
}

/** La première erreur de la saisie, sous le champ qu'elle concerne ; `{}` quand tout va. */
export function verifierSondage(
  saisie: SaisieSondage,
  jour = aujourdhui(),
): ErreurFormulaire<ChampSondage> {
  const question = saisie.question.trim();
  if (question.length === 0)
    return { champ: "question", erreur: "Posez une question aux résidents." };
  if (question.length > LIMITES_SONDAGE.question)
    return {
      champ: "question",
      erreur: `${LIMITES_SONDAGE.question} caractères maximum.`,
    };

  const options = optionsRetenues(saisie);
  if (options.length < LIMITES_SONDAGE.optionsMin)
    return { champ: "options", erreur: "Proposez au moins deux options." };
  if (options.length > LIMITES_SONDAGE.optionsMax)
    return { champ: "options", erreur: "Six options au maximum." };
  if (options.some((o) => o.length > LIMITES_SONDAGE.option))
    return {
      champ: "options",
      erreur: `${LIMITES_SONDAGE.option} caractères maximum par option.`,
    };
  if (new Set(options.map((o) => o.toLowerCase())).size < options.length)
    return { champ: "options", erreur: "Deux options sont identiques." };

  if (saisie.echeance === "")
    return {
      champ: "echeance",
      erreur: "Choisissez la date limite des réponses.",
    };
  if (saisie.echeance < jour)
    return {
      champ: "echeance",
      erreur: "Cette date est déjà passée : personne ne pourrait répondre.",
    };
  return {};
}

/** Ce que la base enregistre d'un sondage, sans identifiant ni annonce. */
export type LigneSondage = Omit<Sondage, "id">;

/** Convertit la saisie vérifiée en ligne à enregistrer. */
export function versLigneSondage(saisie: SaisieSondage): LigneSondage {
  return {
    question: saisie.question.trim(),
    options: optionsRetenues(saisie),
    echeance: saisie.echeance,
  };
}

/** La saisie d'une copie d'annonce : la question et les options, mais pas la date limite. */
export function saisieSondageCopie(sondage: LigneSondage): SaisieSondage {
  return {
    question: sondage.question,
    options: [...sondage.options],
    echeance: "",
  };
}

/** Vrai jusqu'à la date limite comprise : le jour même, on répond encore. */
export function estOuvert(echeance: string, jour = aujourdhui()) {
  return echeance >= jour;
}

/** « 30 octobre », pour « jusqu'au 30 octobre ». */
export function libelleEcheance(echeance: string) {
  return dateSansJour(echeance);
}

/** « Aucune réponse », « 1 réponse », « 23 réponses ». */
export function libelleReponses(nombre: number) {
  if (nombre === 0) return "Aucune réponse";
  return `${nombre} réponse${nombre > 1 ? "s" : ""}`;
}

/**
 * La part de chaque option en pourcentage entier, dont la somme fait 100 : on arrondit à
 * l'entier inférieur, puis les points qui manquent vont aux plus grandes parts restantes (à
 * égalité, à la première option). Sans réponse, chaque option est à 0.
 */
export function pourcentages(votes: number[]) {
  const total = votes.reduce((somme, v) => somme + v, 0);
  if (total === 0) return votes.map(() => 0);
  const parts = votes.map((v) => (v * 100) / total);
  const entiers = parts.map(Math.floor);
  let manquants = 100 - entiers.reduce((somme, p) => somme + p, 0);
  const parReste = parts
    .map((part, rang) => ({ rang, reste: part - entiers[rang] }))
    .sort((a, b) => b.reste - a.reste || a.rang - b.rang);
  for (const { rang } of parReste) {
    if (manquants === 0) break;
    entiers[rang] += 1;
    manquants -= 1;
  }
  return entiers;
}

export type AffichageSondage =
  /** Un résident validé, avant la date limite, sans réponse : les options et « Envoyer ma réponse ». */
  | { etat: "vote" }
  /** Ni vote ni résultat : un résident en attente avant la date limite. */
  | { etat: "lecture" }
  | {
      etat: "resultats";
      votes: number[];
      pourcentages: number[];
      reponses: number;
      /** Rang de l'option choisie, à partir de 1 ; `null` sans réponse. */
      choix: number | null;
      /** La date limite est passée. */
      clos: boolean;
      /** Le conseil syndical lit les résultats avant d'avoir répondu : il peut encore le faire. */
      peutVoter: boolean;
    };

/**
 * Ce que la personne voit : la base ne livre les votes qu'à qui peut les lire (après sa
 * réponse, après la date limite, ou pour le conseil syndical), donc leur présence décide des
 * résultats. Sans votes, on vote quand on le peut et que le sondage est ouvert, sinon on lit.
 */
export function affichageSondage({
  sondage,
  choix,
  votes,
  peutRepondre,
  jour = aujourdhui(),
}: {
  sondage: Sondage;
  choix: number | null;
  votes: number[] | null;
  peutRepondre: boolean;
  jour?: string;
}): AffichageSondage {
  const clos = !estOuvert(sondage.echeance, jour);
  if (votes)
    return {
      etat: "resultats",
      votes,
      pourcentages: pourcentages(votes),
      reponses: votes.reduce((somme, v) => somme + v, 0),
      choix,
      clos,
      peutVoter: peutRepondre && choix === null && !clos,
    };
  return peutRepondre && !clos ? { etat: "vote" } : { etat: "lecture" };
}
