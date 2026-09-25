import { pictogrammeDe, type CategorieActivite } from "./categories-activite";
import type { EtiquetteActivite } from "./etiquettes-activite";
import type { ErreurFormulaire } from "./resultat";

/** Longueurs maximales des textes courts, les mêmes que les contraintes en base. */
export const LIMITES = {
  titre: 50,
  precision_acces: 120,
  mot_accueil: 300,
} as const;

/** Les quatre écrans du parcours : 1 titre et catégorie, 2 date et lieu, 3 capacité et confort, 4 récapitulatif. */
export type Etape = 1 | 2 | 3 | 4;

export const NOMBRE_ETAPES = 4;

export const TITRES_ETAPES: Record<Etape, string> = {
  1: "Titre et catégorie",
  2: "Date et lieu",
  3: "Capacité et confort",
  4: "Récapitulatif",
};

/**
 * Ce que la personne saisit au fil des étapes, tel quel : des chaînes, pour que revenir en
 * arrière rende exactement ce qu'elle avait tapé.
 */
export type SaisieActivite = {
  titre: string;
  categorie: CategorieActivite;
  mot_accueil: string;
  date_activite: string;
  heure_debut: string;
  heure_fin: string;
  lieu: string;
  precision_acces: string;
  /** `sans_limite` : pas de capacité maximale, quoi que contienne `capacite_max`. */
  places: "sans_limite" | "limitees";
  capacite_max: string;
  capacite_min: string;
  etiquettes: EtiquetteActivite[];
  conseils_pratiques: string;
  materiel_prevoir: string;
  a_apporter: string;
};

export type ChampSaisie = Exclude<
  keyof SaisieActivite,
  "etiquettes" | "places"
>;

export const SAISIE_VIDE: SaisieActivite = {
  titre: "",
  categorie: "moments_partages",
  mot_accueil: "",
  date_activite: "",
  heure_debut: "",
  heure_fin: "",
  lieu: "",
  precision_acces: "",
  places: "sans_limite",
  capacite_max: "",
  capacite_min: "",
  etiquettes: [],
  conseils_pratiques: "",
  materiel_prevoir: "",
  a_apporter: "",
};

/** L'activité telle que l'action serveur la publie : nombres convertis, champs vides à `null`. */
export type NouvelleActivite = {
  titre: string;
  categorie: CategorieActivite;
  pictogramme: string;
  mot_accueil: string | null;
  date_activite: string;
  heure_debut: string;
  heure_fin: string;
  lieu: string;
  precision_acces: string | null;
  capacite_max: number | null;
  capacite_min: number | null;
  etiquettes: EtiquetteActivite[];
  conseils_pratiques: string | null;
  materiel_prevoir: string | null;
  a_apporter: string | null;
};

function nombre(valeur: string) {
  const n = Number.parseInt(valeur, 10);
  return Number.isNaN(n) ? null : n;
}

function texte(valeur: string) {
  const t = valeur.trim();
  return t.length > 0 ? t : null;
}

function tropLong(valeur: string, champ: keyof typeof LIMITES) {
  return valeur.length > LIMITES[champ]
    ? `${LIMITES[champ]} caractères maximum.`
    : undefined;
}

/** La capacité maximale saisie, ou `null` sans limite de places (quoi que contienne le champ). */
export function capaciteMaxDe(saisie: SaisieActivite) {
  return saisie.places === "limitees" ? nombre(saisie.capacite_max) : null;
}

/**
 * La première erreur d'une étape, sous le champ qu'elle concerne ; `{}` quand tout va.
 * `placesPrises` : les personnes déjà inscrites à l'activité qu'on modifie, sous lesquelles la
 * capacité ne peut pas descendre (la base le vérifie aussi).
 */
export function verifierEtape(
  etape: Etape,
  saisie: SaisieActivite,
  { placesPrises = 0 }: { placesPrises?: number } = {},
): ErreurFormulaire<ChampSaisie> {
  const erreur = (champ: ChampSaisie, message: string) => ({
    champ,
    erreur: message,
  });

  if (etape === 1) {
    if (saisie.titre.trim().length === 0)
      return erreur("titre", "Donnez un titre à votre activité.");
    const titre = tropLong(saisie.titre, "titre");
    if (titre) return erreur("titre", titre);
    const accueil = tropLong(saisie.mot_accueil, "mot_accueil");
    if (accueil) return erreur("mot_accueil", accueil);
  }

  if (etape === 2) {
    if (!saisie.date_activite)
      return erreur("date_activite", "Choisissez une date.");
    if (!saisie.heure_debut)
      return erreur("heure_debut", "Indiquez l'heure de début.");
    if (!saisie.heure_fin)
      return erreur("heure_fin", "Indiquez l'heure de fin.");
    if (saisie.heure_fin <= saisie.heure_debut)
      return erreur(
        "heure_fin",
        "L'heure de fin doit être après l'heure de début.",
      );
    if (saisie.lieu.trim().length === 0)
      return erreur("lieu", "Indiquez où se tient l'activité.");
    const acces = tropLong(saisie.precision_acces, "precision_acces");
    if (acces) return erreur("precision_acces", acces);
  }

  if (etape === 3) {
    const max = capaciteMaxDe(saisie);
    if (saisie.places === "limitees" && (max === null || max < 1))
      return erreur(
        "capacite_max",
        "Indiquez le nombre de places, au moins 1.",
      );
    if (max !== null && max < placesPrises)
      return erreur(
        "capacite_max",
        `Indiquez au moins ${placesPrises} ${placesPrises === 1 ? "place" : "places"} : elles sont déjà prises.`,
      );
    const min = nombre(saisie.capacite_min);
    if (saisie.capacite_min.trim() !== "" && (min === null || min < 1))
      return erreur(
        "capacite_min",
        "Indiquez un minimum d'au moins 1 personne.",
      );
    if (min !== null && max !== null && min > max)
      return erreur(
        "capacite_min",
        "Le minimum ne peut pas dépasser le nombre de places.",
      );
  }

  return {};
}

/** Convertit la saisie vérifiée en activité à publier. */
export function versNouvelleActivite(saisie: SaisieActivite): NouvelleActivite {
  return {
    titre: saisie.titre.trim(),
    categorie: saisie.categorie,
    pictogramme: pictogrammeDe(saisie.categorie),
    mot_accueil: texte(saisie.mot_accueil),
    date_activite: saisie.date_activite,
    heure_debut: saisie.heure_debut,
    heure_fin: saisie.heure_fin,
    lieu: saisie.lieu.trim(),
    precision_acces: texte(saisie.precision_acces),
    capacite_max: capaciteMaxDe(saisie),
    capacite_min: nombre(saisie.capacite_min),
    etiquettes: saisie.etiquettes,
    conseils_pratiques: texte(saisie.conseils_pratiques),
    materiel_prevoir: texte(saisie.materiel_prevoir),
    a_apporter: texte(saisie.a_apporter),
  };
}

/** Ce qu'il faut d'une activité existante pour pré-remplir le parcours : la fiche telle que la base la livre. */
export type ActiviteExistante = {
  titre: string;
  categorie: CategorieActivite;
  mot_accueil: string | null;
  date_activite: string;
  heure_debut: string;
  heure_fin: string;
  lieu: string;
  precision_acces: string | null;
  capacite_max: number | null;
  capacite_min: number | null;
  etiquettes: EtiquetteActivite[];
  conseils_pratiques: string | null;
  materiel_prevoir: string | null;
  a_apporter: string | null;
};

/** « 16:00:00 » devient « 16:00 », ce que le champ heure attend. */
function heure(valeur: string) {
  return valeur.slice(0, 5);
}

/** La saisie qui pré-remplit « Modifier » : tout ce que l'activité contient déjà. */
export function saisieDepuisActivite(
  activite: ActiviteExistante,
): SaisieActivite {
  return {
    titre: activite.titre,
    categorie: activite.categorie,
    mot_accueil: activite.mot_accueil ?? "",
    date_activite: activite.date_activite,
    heure_debut: heure(activite.heure_debut),
    heure_fin: heure(activite.heure_fin),
    lieu: activite.lieu,
    precision_acces: activite.precision_acces ?? "",
    places: activite.capacite_max === null ? "sans_limite" : "limitees",
    capacite_max:
      activite.capacite_max === null ? "" : String(activite.capacite_max),
    capacite_min:
      activite.capacite_min === null ? "" : String(activite.capacite_min),
    etiquettes: activite.etiquettes,
    conseils_pratiques: activite.conseils_pratiques ?? "",
    materiel_prevoir: activite.materiel_prevoir ?? "",
    a_apporter: activite.a_apporter ?? "",
  };
}

/** La saisie qui pré-remplit « Dupliquer » : tout sauf la date, à choisir de nouveau. */
export function saisieDeCopie(activite: ActiviteExistante): SaisieActivite {
  return { ...saisieDepuisActivite(activite), date_activite: "" };
}
