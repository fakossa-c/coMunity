import type {
  Avertissement,
  AvisAssistant,
  EntreeJev,
  Proposition,
} from "@/assistant";
import type { NomIcone } from "@/components/icones";
import {
  categoriesActiviteListe,
  pictogrammeDe,
  type CategorieActivite,
} from "./categories-activite";
import type { EtiquetteActivite } from "./etiquettes-activite";
import { horaire, jourLong } from "./partage-activite";
import type { ErreurFormulaire } from "./resultat";

/** Longueurs maximales des textes courts, les mêmes que les contraintes en base. */
export const LIMITES = {
  titre: 50,
  description: 600,
  precision_acces: 120,
  mot_accueil: 300,
} as const;

/** Les quatre écrans du parcours : 1 titre, catégorie et photos, 2 date et lieu, 3 capacité et confort, 4 récapitulatif. */
export type Etape = 1 | 2 | 3 | 4;

export const NOMBRE_ETAPES = 4;

export const TITRES_ETAPES: Record<Etape, string> = {
  1: "Titre, catégorie et photos",
  2: "Date et lieu",
  3: "Capacité et confort",
  4: "Récapitulatif",
};

/** Le choix « Autre » de l'étape 2 : un lieu libre, hors des espaces communs. */
export const LIEU_LIBRE = "autre";

/**
 * Ce que la personne saisit au fil des étapes, tel quel : des chaînes, pour que revenir en
 * arrière rende exactement ce qu'elle avait tapé.
 */
export type SaisieActivite = {
  titre: string;
  categorie: CategorieActivite;
  /** Un pictogramme propre à l'activité ; `""` : celui de sa catégorie. */
  pictogramme: string;
  /** La description de l'activité, sur sa fiche : ce qu'on y fait, pour qui, comment venir. */
  description: string;
  /** Le mot personnel de l'organisateur, en encart en tête de la fiche : distinct de la description. */
  mot_accueil: string;
  date_activite: string;
  heure_debut: string;
  heure_fin: string;
  /** L'identifiant de l'espace commun choisi, `LIEU_LIBRE` pour « Autre », `""` avant tout choix. */
  espace_commun: string;
  /** Le lieu libre, saisi avec « Autre ». */
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
  pictogramme: "",
  description: "",
  mot_accueil: "",
  date_activite: "",
  heure_debut: "",
  heure_fin: "",
  espace_commun: "",
  lieu: "",
  precision_acces: "",
  places: "sans_limite",
  capacite_max: "",
  capacite_min: "1",
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
  description: string | null;
  mot_accueil: string | null;
  date_activite: string;
  heure_debut: string;
  heure_fin: string;
  /** `null` : lieu libre. */
  espace_commun_id: string | null;
  /** Le lieu libre, ou le nom de l'espace commun. */
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
    const description = tropLong(saisie.description, "description");
    if (description) return erreur("description", description);
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
    if (saisie.espace_commun === "")
      return erreur("espace_commun", "Choisissez où se tient l'activité.");
    if (saisie.espace_commun === LIEU_LIBRE && saisie.lieu.trim().length === 0)
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
        `Indiquez au moins ${placesPrises} ${placesPrises === 1 ? "place" : "places"} : elles sont déjà prises.`,
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

/**
 * La première erreur de la page entière (ordinateur), dans l'ordre des étapes du mobile : mêmes
 * champs, même validation. `{}` quand tout va.
 */
export function verifierPage(
  saisie: SaisieActivite,
  options: { placesPrises?: number } = {},
): ErreurFormulaire<ChampSaisie> {
  for (const etape of [1, 2, 3] as const) {
    const verdict = verifierEtape(etape, saisie, options);
    if (verdict.erreur) return verdict;
  }
  return {};
}

/** Les six blocs de la page unique, par identifiant d'ancre. */
export type BlocPage =
  | "titre-description"
  | "categorie"
  | "photos"
  | "date-heure"
  | "lieu"
  | "precisions";

/** Un point de la liste « Il reste à remplir » : fait ou non, obligatoire ou seulement conseillé. */
export type PointARemplir = {
  cle: "titre" | "date_heure" | "lieu" | "places" | "description";
  libelle: string;
  fait: boolean;
  obligatoire: boolean;
  /** Ce qu'il reste à faire (« à saisir »), vide une fois le point fait. */
  etat: string;
  /** Le bloc de la page où le remplir. */
  bloc: BlocPage;
};

/**
 * La liste « Il reste à remplir » de la colonne de droite : le titre, la date et l'heure, le lieu
 * et, pour des places limitées, leur nombre ; puis la description, conseillée mais facultative.
 * Un point obligatoire non fait empêche de publier.
 */
export function resteARemplir(saisie: SaisieActivite): PointARemplir[] {
  const titre = saisie.titre.trim() !== "";
  const creneau =
    saisie.date_activite !== "" &&
    saisie.heure_debut !== "" &&
    saisie.heure_fin !== "";
  const lieuLibre = saisie.espace_commun === LIEU_LIBRE;
  const lieu =
    saisie.espace_commun !== "" && (!lieuLibre || saisie.lieu.trim() !== "");
  const places = saisie.places === "limitees" && capaciteMaxDe(saisie) === null;
  const description = saisie.description.trim() !== "";
  const point = (
    cle: PointARemplir["cle"],
    libelle: string,
    fait: boolean,
    obligatoire: boolean,
    etat: string,
    bloc: BlocPage,
  ): PointARemplir => ({
    cle,
    libelle,
    fait,
    obligatoire,
    etat: fait ? "" : etat,
    bloc,
  });
  return [
    point("titre", "Titre", titre, true, "à saisir", "titre-description"),
    point(
      "date_heure",
      "Date et heure",
      creneau,
      true,
      "à choisir",
      "date-heure",
    ),
    point(
      "lieu",
      "Lieu",
      lieu,
      true,
      lieuLibre && saisie.lieu.trim() === "" ? "à nommer" : "à choisir",
      "lieu",
    ),
    ...(places
      ? [point("places", "Places", false, true, "à indiquer", "precisions")]
      : []),
    point(
      "description",
      "Description",
      description,
      false,
      "conseillée",
      "titre-description",
    ),
  ];
}

/**
 * L'espace commun que l'adresse `?espace=` préchoisit : son identifiant s'il figure parmi les
 * espaces de la résidence, sinon `""` (l'adresse est ignorée).
 */
export function espaceDeLAdresse(
  espaces: { id: string }[],
  espace: string | undefined,
) {
  return espace && espaces.some(({ id }) => id === espace) ? espace : "";
}

/** « 1 h 30 », « 45 min », « 2 h » ; `""` sans les deux heures ou quand la fin n'est pas après le début. */
export function dureeDe(debut: string, fin: string) {
  if (!debut || !fin || fin <= debut) return "";
  const minutes = (valeur: string) => {
    const [h, m] = valeur.split(":");
    return Number(h) * 60 + Number(m);
  };
  const total = minutes(fin) - minutes(debut);
  const heures = Math.floor(total / 60);
  const reste = total % 60;
  if (heures === 0) return `${reste} min`;
  return reste === 0
    ? `${heures} h`
    : `${heures} h ${String(reste).padStart(2, "0")}`;
}

/** Le jour et l'horaire de l'aperçu : « Samedi 24 octobre · De 16h00 à 18h30 », ou ce qui reste à choisir. */
export function resumeCreneau(saisie: SaisieActivite) {
  if (!saisie.date_activite) return "Date et heure à choisir";
  const jour = jourLong(saisie.date_activite);
  return saisie.heure_debut && saisie.heure_fin
    ? `${jour} · ${horaire(saisie.heure_debut, saisie.heure_fin)}`
    : jour;
}

/** Les places de l'aperçu : « Jusqu'à 12 personnes · confirmée dès 4 », « Sans limite de places »… */
export function resumePlaces(saisie: SaisieActivite) {
  const max = capaciteMaxDe(saisie);
  if (saisie.places === "limitees" && max === null)
    return "Nombre de places à indiquer";
  const base =
    max === null
      ? "Sans limite de places"
      : `Jusqu'à ${max} ${max === 1 ? "personne" : "personnes"}`;
  const min = nombre(saisie.capacite_min);
  return min !== null && min > 1 ? `${base} · confirmée dès ${min}` : base;
}

/** Le pictogramme de l'activité : celui qu'on lui a donné, à défaut celui de sa catégorie. */
export function pictogrammeDeLaSaisie(saisie: SaisieActivite): NomIcone {
  return (saisie.pictogramme || pictogrammeDe(saisie.categorie)) as NomIcone;
}

/** Change la catégorie : le pictogramme repart de celui de la nouvelle catégorie. */
export function changerCategorie(
  saisie: SaisieActivite,
  categorie: CategorieActivite,
): SaisieActivite {
  return { ...saisie, categorie, pictogramme: "" };
}

/**
 * La saisie une fois appliquées les suggestions de l'assistant, quand elles existent. Ce que le
 * créateur a choisi lui-même (`choisi`) n'est jamais remplacé : il peut toujours changer d'avis.
 */
export function appliquerSuggestions(
  saisie: SaisieActivite,
  {
    categorieSuggeree,
    pictogrammeSuggere,
  }: Pick<AvisAssistant, "categorieSuggeree" | "pictogrammeSuggere">,
  choisi: { categorie: boolean; pictogramme: boolean },
): SaisieActivite {
  let suivante = saisie;
  const categorie = categoriesActiviteListe.find(
    (clef) => clef === categorieSuggeree,
  );
  if (categorie && !choisi.categorie)
    suivante = changerCategorie(suivante, categorie);
  if (pictogrammeSuggere && !choisi.pictogramme)
    suivante = {
      ...suivante,
      pictogramme:
        pictogrammeSuggere === pictogrammeDe(suivante.categorie)
          ? ""
          : pictogrammeSuggere,
    };
  return suivante;
}

/** L'espace commun choisi, ou `null` pour un lieu libre. */
function idEspaceChoisi(saisie: SaisieActivite) {
  return saisie.espace_commun === LIEU_LIBRE || saisie.espace_commun === ""
    ? null
    : saisie.espace_commun;
}

/**
 * Convertit la saisie vérifiée en activité à publier. `espaces` donne le nom de l'espace commun
 * choisi (la base le reprend de toute façon).
 */
export function versNouvelleActivite(
  saisie: SaisieActivite,
  espaces: { id: string; nom: string }[] = [],
): NouvelleActivite {
  const idEspace = idEspaceChoisi(saisie);
  const espace = espaces.find((e) => e.id === idEspace);
  return {
    titre: saisie.titre.trim(),
    categorie: saisie.categorie,
    pictogramme: pictogrammeDeLaSaisie(saisie),
    description: texte(saisie.description),
    mot_accueil: texte(saisie.mot_accueil),
    date_activite: saisie.date_activite,
    heure_debut: saisie.heure_debut,
    heure_fin: saisie.heure_fin,
    espace_commun_id: idEspace,
    lieu: idEspace ? (espace?.nom ?? idEspace) : saisie.lieu.trim(),
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
  pictogramme: string;
  description: string | null;
  mot_accueil: string | null;
  date_activite: string;
  heure_debut: string;
  heure_fin: string;
  espace_commun_id: string | null;
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
    pictogramme:
      activite.pictogramme === pictogrammeDe(activite.categorie)
        ? ""
        : activite.pictogramme,
    description: activite.description ?? "",
    mot_accueil: activite.mot_accueil ?? "",
    date_activite: activite.date_activite,
    heure_debut: heure(activite.heure_debut),
    heure_fin: heure(activite.heure_fin),
    espace_commun: activite.espace_commun_id ?? LIEU_LIBRE,
    lieu: activite.espace_commun_id ? "" : activite.lieu,
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

/** La saisie qui pré-remplit « Nouvelle date » : tout sauf la date, à choisir de nouveau. */
export function saisieDeCopie(activite: ActiviteExistante): SaisieActivite {
  return { ...saisieDepuisActivite(activite), date_activite: "" };
}

/** La longueur au plus de `descriptionPourAssistant` : les deux textes et la ligne vide qui les sépare. */
export const LONGUEUR_MAX_POUR_ASSISTANT =
  LIMITES.description + LIMITES.mot_accueil + 2;

/**
 * Ce que l'assistant lit de l'activité comme description : la description, puis le mot d'accueil,
 * séparés par une ligne vide. Les deux textes sont publiés, les deux passent donc par Jev.
 */
export function descriptionPourAssistant(saisie: SaisieActivite) {
  return [saisie.description, saisie.mot_accueil]
    .map((texte) => texte.trim())
    .filter(Boolean)
    .join("\n\n");
}

/**
 * L'avis complet de l'assistant : les règles de la résidence (`local`), complétées par l'avis de
 * Jev quand il y en a un (un Jev absent, en erreur ou lent n'ajoute rien).
 */
export function fusionnerAvis(
  local: AvisAssistant,
  jev: AvisAssistant | null,
  saisie: SaisieActivite,
  reference?: SaisieActivite,
): AvisAssistant {
  return {
    ...local,
    avertissements: avertissementsApplicables(
      [...local.avertissements, ...(jev?.avertissements ?? [])],
      saisie,
      reference,
    ),
    moderation: jev?.moderation ?? local.moderation,
  };
}

/** La proposition que l'assistant analyse, tirée de la saisie. */
export function propositionDe(saisie: SaisieActivite): Proposition {
  const idEspace = idEspaceChoisi(saisie);
  return {
    titre: saisie.titre,
    description: descriptionPourAssistant(saisie),
    categorie: saisie.categorie,
    date: saisie.date_activite,
    heureDebut: saisie.heure_debut,
    heureFin: saisie.heure_fin,
    lieu: idEspace
      ? { type: "espace_commun", idEspace }
      : { type: "libre", libelle: saisie.lieu },
    capaciteMax: capaciteMaxDe(saisie),
  };
}

/**
 * Ce que le navigateur confie au serveur pour interroger Jev : le titre, la description et le
 * créneau, rien du lieu ni des places.
 */
export function entreeJevDe(saisie: SaisieActivite): EntreeJev {
  const { titre, description, date, heureDebut, heureFin } =
    propositionDe(saisie);
  return { titre, description, date, heureDebut, heureFin };
}

/** La proposition que l'assistant relit d'une activité qui vient d'être publiée. */
export function propositionDeNouvelleActivite(
  activite: NouvelleActivite,
): Proposition {
  return {
    titre: activite.titre,
    description: [activite.description, activite.mot_accueil]
      .filter(Boolean)
      .join("\n\n"),
    categorie: activite.categorie,
    date: activite.date_activite,
    heureDebut: activite.heure_debut,
    heureFin: activite.heure_fin,
    lieu: { type: "libre", libelle: activite.lieu },
    capaciteMax: activite.capacite_max,
  };
}

/**
 * La règle bloquante de l'assistant qui arrête l'étape, sous le champ à corriger : l'heure de fin
 * à l'étape 2, le nombre de places à l'étape 3. Au récapitulatif, toute règle bloquante empêche
 * de publier. `{}` quand rien ne bloque.
 */
export function blocageDeLEtape(
  etape: Etape,
  avertissements: Avertissement[],
  saisie: SaisieActivite,
): ErreurFormulaire<ChampSaisie> {
  const bloquants = avertissements.filter((a) => a.bloquant);
  if (etape === 2) {
    const limite = bloquants.find((a) => a.regle === "heure_fin_max");
    if (limite) return { champ: "heure_fin", erreur: limite.message };
  }
  if (etape === 3) {
    const capacite = bloquants.find((a) => a.regle === "capacite_espace");
    if (capacite)
      return saisie.places === "limitees"
        ? { champ: "capacite_max", erreur: capacite.message }
        : { erreur: capacite.message };
  }
  if (etape === 4 && bloquants.length > 0)
    return { erreur: bloquants[0].message };
  return {};
}

/**
 * Les avertissements qui s'appliquent à la saisie. En modification (`reference` : la saisie de
 * départ), une règle d'espace commun ne bloque que si l'espace, l'heure de fin ou les places
 * changent, comme en base : ses règles ont pu changer depuis la publication. Elle reste dite.
 */
export function avertissementsApplicables(
  avertissements: Avertissement[],
  saisie: SaisieActivite,
  reference?: SaisieActivite,
): Avertissement[] {
  const inchangee =
    reference !== undefined &&
    saisie.espace_commun === reference.espace_commun &&
    saisie.heure_fin === reference.heure_fin &&
    capaciteMaxDe(saisie) === capaciteMaxDe(reference);
  return inchangee
    ? avertissements.map((a) => ({ ...a, bloquant: false }))
    : avertissements;
}
