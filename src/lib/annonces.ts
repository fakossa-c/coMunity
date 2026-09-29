import type { NomIcone } from "@/components/icones";
import { aujourdhui, jourLong } from "./partage-activite";
import type { ErreurFormulaire } from "./resultat";

/** Un type par valeur de l'énumération `type_annonce` en base, dans l'ordre de la liste. */
export type TypeAnnonce = "assemblee" | "sondage" | "travaux" | "info";

/**
 * Ce que fixe le type d'une annonce : sa pastille, sa couleur et son pictogramme. `ton` suit les
 * pastilles du design system : pêche pour l'assemblée, abricot pour le sondage, vert pour les
 * travaux et les informations.
 */
export const typesAnnonce = {
  assemblee: { libelle: "Assemblée générale", icone: "groups", ton: "peche" },
  sondage: { libelle: "Sondage", icone: "how_to_vote", ton: "abricot" },
  travaux: { libelle: "Travaux", icone: "construction", ton: "vert" },
  info: { libelle: "Information", icone: "campaign", ton: "vert" },
} as const satisfies Record<
  TypeAnnonce,
  { libelle: string; icone: NomIcone; ton: "peche" | "abricot" | "vert" }
>;

export const typesAnnonceListe = Object.keys(typesAnnonce) as TypeAnnonce[];

/** Une annonce telle que la table `annonce` la livre. */
export type Annonce = {
  id: string;
  identifiant_public: string;
  type: TypeAnnonce;
  titre: string;
  texte: string | null;
  /** Ligne libre : « Jeudi 12 novembre à 18h30 », « Du 2 au 20 novembre ». */
  quand: string | null;
  /** Ligne libre : « Salle commune, rez-de-chaussée ». */
  lieu: string | null;
  /** Chemin dans le bucket `annonces`. */
  photo_chemin: string | null;
  /** Chemin du PDF dans le bucket `annonces`. */
  document_chemin: string | null;
  epinglee: boolean;
  /** `AAAA-MM-JJ`, dernier jour dans la liste ; `null` : n'expire pas. */
  expire_le: string | null;
  publiee_le: string;
};

/** Ce que la fonction `fiche_annonce` livre à un visiteur : l'annonce, sans son identifiant interne. */
export type FicheAnnonce = Omit<Annonce, "id" | "epinglee">;

/** Les colonnes à lire pour une `Annonce`. */
export const COLONNES_ANNONCE =
  "id, identifiant_public, type, titre, texte, quand, lieu, photo_chemin, document_chemin, epinglee, expire_le, publiee_le";

export const BUCKET_ANNONCES = "annonces";

/** Chemin de la page publique d'une annonce, celui du lien partagé. */
export function cheminAnnonce(identifiant: string) {
  return `/annonces/${identifiant}`;
}

export type FiltreAnnonce =
  "toutes" | "assemblees" | "sondages" | "travaux-infos";

const typesParFiltre: Record<FiltreAnnonce, TypeAnnonce[] | null> = {
  toutes: null,
  assemblees: ["assemblee"],
  sondages: ["sondage"],
  "travaux-infos": ["travaux", "info"],
};

/** Les types que garde un filtre ; `null` : tous. */
export function typesDuFiltre(filtre: FiltreAnnonce) {
  return typesParFiltre[filtre];
}

/** Le filtre demandé par l'adresse ; « Toutes » quand elle n'en nomme aucun connu. */
export function filtreAnnonce(parametre: string | undefined): FiltreAnnonce {
  return parametre !== undefined && Object.hasOwn(typesParFiltre, parametre)
    ? (parametre as FiltreAnnonce)
    : "toutes";
}

const SEPT_JOURS = 7 * 24 * 60 * 60 * 1000;

/** Vrai pendant les 7 jours qui suivent la publication : l'étiquette « Nouveau ». */
export function estNouvelle(publieeLe: string, maintenant = new Date()) {
  return maintenant.getTime() - new Date(publieeLe).getTime() < SEPT_JOURS;
}

/** Vrai le lendemain du jour d'expiration : ce jour-là, l'annonce figure encore dans la liste. */
export function estExpiree(expireLe: string | null, jour = aujourdhui()) {
  return expireLe !== null && expireLe < jour;
}

const FORMAT_JOUR_RESIDENCE = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "long",
  timeZone: "Europe/Paris",
});

/**
 * « 20 octobre », pour une date `AAAA-MM-JJ` ou un horodatage ISO. Un horodatage se lit dans le
 * fuseau de la résidence : une annonce publiée à 1 h du matin ne porte pas la date de la veille.
 */
export function dateSansJour(date: string) {
  if (date.length > 10) return FORMAT_JOUR_RESIDENCE.format(new Date(date));
  return jourLong(date).split(" ").slice(1).join(" ");
}

/** « Publiée le 20 octobre par le conseil syndical ». */
export function libellePublication(publieeLe: string) {
  return `Publiée le ${dateSansJour(publieeLe)} par le conseil syndical`;
}

/** Les lignes d'information d'une carte : quand (une période pour des travaux), puis où. */
export function infosAnnonce(
  annonce: Pick<Annonce, "type" | "quand" | "lieu">,
): { icone: NomIcone; titre: string }[] {
  const lignes: { icone: NomIcone; titre: string }[] = [];
  if (annonce.quand)
    lignes.push({
      icone: annonce.type === "travaux" ? "date_range" : "event",
      titre: annonce.quand,
    });
  if (annonce.lieu) lignes.push({ icone: "location_on", titre: annonce.lieu });
  return lignes;
}

/** Le bouton du PDF joint : la convocation pour une assemblée, le document sinon. */
export function libelleDocument(type: TypeAnnonce) {
  return type === "assemblee" ? "Lire la convocation" : "Lire le document";
}

/** Le message à coller dans le groupe WhatsApp de la résidence. */
export function messageWhatsAppAnnonce(
  annonce: Pick<Annonce, "titre" | "quand" | "lieu">,
  lien: string,
) {
  return [
    `📢 ${annonce.titre}`,
    annonce.quand && `📅 ${annonce.quand}`,
    annonce.lieu && `📍 ${annonce.lieu}`,
    lien,
  ]
    .filter(Boolean)
    .join("\n");
}

/** Longueurs maximales des textes, les mêmes que les contraintes en base. */
export const LIMITES_ANNONCE = {
  titre: 100,
  texte: 2000,
  quand: 120,
  lieu: 120,
} as const;

type ChampTexte = keyof typeof LIMITES_ANNONCE;

/** Ce que le conseil syndical saisit, tel quel. */
export type SaisieAnnonce = Record<ChampTexte, string> & {
  type: TypeAnnonce;
  epinglee: boolean;
  /** `AAAA-MM-JJ`, ou vide. */
  expire_le: string;
  photo_chemin: string | null;
  document_chemin: string | null;
};

export type ChampAnnonce = "titre" | "texte" | "quand" | "lieu" | "expire_le";

export const SAISIE_ANNONCE_VIDE: SaisieAnnonce = {
  type: "info",
  titre: "",
  texte: "",
  quand: "",
  lieu: "",
  epinglee: false,
  expire_le: "",
  photo_chemin: null,
  document_chemin: null,
};

/** La première erreur de la saisie, sous le champ qu'elle concerne ; `{}` quand tout va. */
export function verifierAnnonce(
  saisie: SaisieAnnonce,
  jour = aujourdhui(),
  /** L'expiration déjà enregistrée : la garder ne bloque pas la correction d'une annonce expirée. */
  expirationEnregistree: string | null = null,
): ErreurFormulaire<ChampAnnonce> {
  if (saisie.titre.trim().length === 0)
    return { champ: "titre", erreur: "Donnez un titre à l'annonce." };
  for (const champ of Object.keys(LIMITES_ANNONCE) as ChampTexte[]) {
    if (saisie[champ].trim().length > LIMITES_ANNONCE[champ])
      return { champ, erreur: `${LIMITES_ANNONCE[champ]} caractères maximum.` };
  }
  if (
    saisie.expire_le !== "" &&
    saisie.expire_le < jour &&
    saisie.expire_le !== expirationEnregistree
  )
    return {
      champ: "expire_le",
      erreur:
        "Cette date est déjà passée : l'annonce n'apparaîtrait nulle part.",
    };
  return {};
}

/** Ce que la base enregistre d'une annonce, sans identifiant ni date de publication. */
export type LigneAnnonce = Omit<
  Annonce,
  "id" | "identifiant_public" | "publiee_le"
>;

function texte(valeur: string) {
  const t = valeur.trim();
  return t.length > 0 ? t : null;
}

/** Convertit la saisie vérifiée en ligne à enregistrer. */
export function versLigneAnnonce(saisie: SaisieAnnonce): LigneAnnonce {
  return {
    type: saisie.type,
    titre: saisie.titre.trim(),
    texte: texte(saisie.texte),
    quand: texte(saisie.quand),
    lieu: texte(saisie.lieu),
    epinglee: saisie.epinglee,
    expire_le: saisie.expire_le || null,
    photo_chemin: saisie.photo_chemin,
    document_chemin: saisie.document_chemin,
  };
}

/** La saisie qui préremplit la modification d'une annonce. */
export function saisieDepuisAnnonce(annonce: Annonce): SaisieAnnonce {
  return {
    type: annonce.type,
    titre: annonce.titre,
    texte: annonce.texte ?? "",
    quand: annonce.quand ?? "",
    lieu: annonce.lieu ?? "",
    epinglee: annonce.epinglee,
    expire_le: annonce.expire_le ?? "",
    photo_chemin: annonce.photo_chemin,
    document_chemin: annonce.document_chemin,
  };
}

/** La saisie d'une copie : le contenu de l'annonce, mais ni son épingle ni son échéance. */
export function saisieCopie(annonce: Annonce): SaisieAnnonce {
  return { ...saisieDepuisAnnonce(annonce), epinglee: false, expire_le: "" };
}

const TAILLE_MAX_FICHIER = 5 * 1024 * 1024;

const formats = {
  photo: {
    types: ["image/jpeg", "image/png", "image/webp"],
    refus: "Choisissez une photo au format JPEG, PNG ou WebP.",
  },
  document: {
    types: ["application/pdf"],
    refus: "Choisissez un document au format PDF.",
  },
};

export type GenreFichier = keyof typeof formats;

/** Le format et le poids d'un fichier joint, comme le bucket les exige ; `null` quand il passe. */
export function verifierFichier(
  fichier: { type: string; size: number },
  genre: GenreFichier,
) {
  if (!formats[genre].types.includes(fichier.type)) return formats[genre].refus;
  if (fichier.size > TAILLE_MAX_FICHIER) return "Ce fichier pèse plus de 5 Mo.";
  return null;
}

const EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "application/pdf": "pdf",
};

/**
 * Le chemin d'un fichier dans le bucket : un dossier propre à chaque dépôt (`dossier`, un UUID),
 * puis le nom du fichier sans accents ni caractères d'adresse, avec l'extension de son format.
 */
export function cheminDeDepot(dossier: string, nom: string, type: string) {
  const base = nom
    .replace(/\.[^.]*$/, "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return `${dossier}/${base || "fichier"}.${EXTENSIONS[type]}`;
}

/** Vrai pour un chemin que `cheminDeDepot` a pu produire : rien d'autre ne s'enregistre en base. */
export function estCheminDeFichier(chemin: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/[a-z0-9][a-z0-9-]*\.(jpg|png|webp|pdf)$/.test(
    chemin,
  );
}
