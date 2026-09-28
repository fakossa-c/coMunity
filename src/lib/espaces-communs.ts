import type { ReglesResidence } from "@/assistant";
import type { NomIcone } from "@/components/icones";
import { heure } from "./partage-activite";
import type { ErreurFormulaire } from "./resultat";

/** Un équipement par valeur de l'énumération `equipement_espace` en base, dans l'ordre de la liste. */
export const equipementsEspace = {
  acces_plain_pied: { libelle: "Accès plain-pied", icone: "accessible" },
  ascenseur: { libelle: "Ascenseur", icone: "elevator" },
  chaises: { libelle: "Chaises", icone: "chair" },
  tables: { libelle: "Tables", icone: "table_restaurant" },
  cuisine: { libelle: "Coin cuisine", icone: "kitchen" },
  toilettes: { libelle: "Toilettes", icone: "wc" },
  exterieur: { libelle: "En extérieur", icone: "park" },
} as const satisfies Record<string, { libelle: string; icone: NomIcone }>;

export type EquipementEspace = keyof typeof equipementsEspace;

export const equipementsEspaceListe = Object.keys(
  equipementsEspace,
) as EquipementEspace[];

/** Un espace commun tel que la table `espace_commun` le livre. */
export type EspaceCommun = {
  id: string;
  nom: string;
  batiment: string | null;
  localisation: string | null;
  description: string | null;
  /** `null` : pas de capacité fixée. */
  capacite: number | null;
  equipements: EquipementEspace[];
  /** « 21:00:00 » ; `null` : pas d'heure limite. */
  heure_fin_max: string | null;
  consignes: string | null;
  horaires_acces: string | null;
  contact: string | null;
};

/** Les colonnes à lire pour un `EspaceCommun`. */
export const COLONNES_ESPACE =
  "id, nom, batiment, localisation, description, capacite, equipements, heure_fin_max, consignes, horaires_acces, contact";

/** Longueurs maximales des textes, les mêmes que les contraintes en base. */
export const LIMITES_ESPACE = {
  nom: 60,
  batiment: 60,
  localisation: 120,
  description: 500,
  consignes: 500,
  horaires_acces: 120,
  contact: 120,
} as const;

type ChampTexte = keyof typeof LIMITES_ESPACE;

/** Ce que le conseil syndical saisit, tel quel. */
export type SaisieEspace = Record<ChampTexte, string> & {
  capacite: string;
  equipements: EquipementEspace[];
  heure_fin_max: string;
};

export type ChampEspace = Exclude<keyof SaisieEspace, "equipements">;

export const SAISIE_ESPACE_VIDE: SaisieEspace = {
  nom: "",
  batiment: "",
  localisation: "",
  description: "",
  capacite: "",
  equipements: [],
  heure_fin_max: "",
  consignes: "",
  horaires_acces: "",
  contact: "",
};

/** Ce que la base enregistre, sans l'identifiant. */
export type NouvelEspace = Omit<EspaceCommun, "id">;

function texte(valeur: string) {
  const t = valeur.trim();
  return t.length > 0 ? t : null;
}

/** La première erreur de la saisie, sous le champ qu'elle concerne ; `{}` quand tout va. */
export function verifierEspace(
  saisie: SaisieEspace,
): ErreurFormulaire<ChampEspace> {
  if (saisie.nom.trim().length === 0)
    return { champ: "nom", erreur: "Donnez un nom à l'espace commun." };
  for (const champ of Object.keys(LIMITES_ESPACE) as ChampTexte[]) {
    if (saisie[champ].trim().length > LIMITES_ESPACE[champ])
      return { champ, erreur: `${LIMITES_ESPACE[champ]} caractères maximum.` };
  }
  if (saisie.capacite.trim() !== "") {
    const capacite = Number(saisie.capacite);
    if (!Number.isInteger(capacite) || capacite < 1)
      return {
        champ: "capacite",
        erreur: "Indiquez une capacité d'au moins 1 personne, ou laissez vide.",
      };
  }
  return {};
}

/** Convertit la saisie vérifiée en ligne à enregistrer. */
export function versEspaceCommun(saisie: SaisieEspace): NouvelEspace {
  return {
    nom: saisie.nom.trim(),
    batiment: texte(saisie.batiment),
    localisation: texte(saisie.localisation),
    description: texte(saisie.description),
    capacite: saisie.capacite.trim() === "" ? null : Number(saisie.capacite),
    equipements: equipementsEspaceListe.filter((e) =>
      saisie.equipements.includes(e),
    ),
    heure_fin_max: saisie.heure_fin_max || null,
    consignes: texte(saisie.consignes),
    horaires_acces: texte(saisie.horaires_acces),
    contact: texte(saisie.contact),
  };
}

/** La saisie qui pré-remplit la modification d'un espace commun. */
export function saisieDepuisEspace(espace: EspaceCommun): SaisieEspace {
  return {
    nom: espace.nom,
    batiment: espace.batiment ?? "",
    localisation: espace.localisation ?? "",
    description: espace.description ?? "",
    capacite: espace.capacite === null ? "" : String(espace.capacite),
    equipements: espace.equipements,
    heure_fin_max: espace.heure_fin_max?.slice(0, 5) ?? "",
    consignes: espace.consignes ?? "",
    horaires_acces: espace.horaires_acces ?? "",
    contact: espace.contact ?? "",
  };
}

/** « Jusqu'à 20 personnes », « Sans limite de places ». */
export function libelleCapacite(capacite: number | null) {
  if (capacite === null) return "Sans limite de places";
  return `Jusqu'à ${capacite} ${capacite === 1 ? "personne" : "personnes"}`;
}

/** « Bâtiment B · Jusqu'à 20 personnes · Ferme à 21h00 » : un espace commun en une ligne. */
export function resumeEspace(
  espace: Pick<EspaceCommun, "batiment" | "capacite" | "heure_fin_max">,
) {
  return [
    espace.batiment,
    libelleCapacite(espace.capacite),
    espace.heure_fin_max && `Ferme à ${heure(espace.heure_fin_max)}`,
  ]
    .filter(Boolean)
    .join(" · ");
}

/** Une activité publiée dans un espace commun, telle que la table `activite` la livre. */
export type OccupationEspace = {
  titre: string;
  espace_commun_id: string;
  date_activite: string;
  heure_debut: string;
  heure_fin: string;
};

/** Les règles de la résidence, dans la forme que l'assistant attend. */
export function reglesResidence({
  heureCalme,
  espaces,
  occupations,
}: {
  heureCalme: string | null;
  espaces: EspaceCommun[];
  occupations: OccupationEspace[];
}): ReglesResidence {
  return {
    heureCalme,
    espacesCommuns: espaces.map((e) => ({
      id: e.id,
      nom: e.nom,
      capacite: e.capacite,
      heureFinMax: e.heure_fin_max,
    })),
    occupations: occupations.map((o) => ({
      titre: o.titre,
      idEspace: o.espace_commun_id,
      date: o.date_activite,
      heureDebut: o.heure_debut,
      heureFin: o.heure_fin,
    })),
  };
}
