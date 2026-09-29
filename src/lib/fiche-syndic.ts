import { refusFormatEmail } from "./email";
import { nomComplet } from "./nom-complet";
import type { ErreurFormulaire } from "./resultat";

/** Le bucket privé des photos de Mon syndic. */
export const BUCKET_SYNDIC = "syndic";

/** Une fiche de Mon syndic telle que `lister_fiches_syndic` la livre. */
export type FicheSyndic = {
  id: string;
  prenom: string;
  nom: string;
  telephone: string | null;
  email: string | null;
  photo_chemin: string | null;
  /** Le compte syndic relié : donné au seul conseil syndical, `null` pour un résident. */
  compte_id: string | null;
  /** Vrai quand la fiche est reliée à un compte syndic encore actif. */
  sur_comunity: boolean;
};

/** Ce que le conseil syndical saisit pour une fiche ; les champs facultatifs vides valent une chaîne vide. */
export type SaisieFiche = {
  prenom: string;
  nom: string;
  telephone: string;
  email: string;
  /** L'identifiant du compte syndic relié, ou vide. */
  compteId: string;
};
export type ChampFiche = "prenom" | "nom" | "telephone" | "email";

/** La ligne à écrire dans `fiche_syndic`, sans la photo (elle a son propre parcours). */
export type LigneFiche = {
  prenom: string;
  nom: string;
  telephone: string | null;
  email: string | null;
  compte_id: string | null;
};

/** Longueurs maximales, les mêmes que les contraintes en base. */
export const LIMITES_FICHE = {
  identite: 50,
  telephone: 30,
  email: 254,
} as const;

const LIBELLES = { prenom: "le prénom", nom: "le nom" } as const;
// Chiffres, espaces, points, tirets et parenthèses, avec un « + » possible en tête.
const FORMAT_TELEPHONE = /^\+?[\d\s().-]+$/;
const CHIFFRES_MIN = 6;

/** La première erreur de la saisie, sous le champ qu'elle concerne ; `{}` quand tout va. */
export function verifierFiche(
  saisie: SaisieFiche,
): ErreurFormulaire<ChampFiche> {
  const ligne = versLigneFiche(saisie);
  for (const champ of ["prenom", "nom"] as const) {
    if (ligne[champ] === "")
      return { champ, erreur: `Saisissez ${LIBELLES[champ]}.` };
    if (ligne[champ].length > LIMITES_FICHE.identite)
      return {
        champ,
        erreur: `${LIMITES_FICHE.identite} caractères maximum.`,
      };
  }
  if (ligne.telephone !== null) {
    const chiffres = ligne.telephone.replace(/\D/g, "").length;
    if (
      !FORMAT_TELEPHONE.test(ligne.telephone) ||
      chiffres < CHIFFRES_MIN ||
      ligne.telephone.length > LIMITES_FICHE.telephone
    )
      return {
        champ: "telephone",
        erreur: "Saisissez un numéro de téléphone, par exemple 01 23 45 67 89.",
      };
  }
  if (ligne.email !== null) {
    const refus = refusFormatEmail(ligne.email);
    if (refus) return refus;
    if (ligne.email.length > LIMITES_FICHE.email)
      return {
        champ: "email",
        erreur: `${LIMITES_FICHE.email} caractères maximum.`,
      };
  }
  return {};
}

/** Convertit la saisie en ligne à enregistrer : sans espaces autour, `null` pour ce qui est vide, e-mail en minuscules. */
export function versLigneFiche(saisie: SaisieFiche): LigneFiche {
  const facultatif = (valeur: string) => valeur.trim() || null;
  return {
    prenom: saisie.prenom.trim(),
    nom: saisie.nom.trim(),
    telephone: facultatif(saisie.telephone),
    email: facultatif(saisie.email)?.toLowerCase() ?? null,
    compte_id: facultatif(saisie.compteId),
  };
}

/** Remplit le formulaire d'une fiche existante. */
export function saisieDepuisFiche(fiche: FicheSyndic): SaisieFiche {
  return {
    prenom: fiche.prenom,
    nom: fiche.nom,
    telephone: fiche.telephone ?? "",
    email: fiche.email ?? "",
    compteId: fiche.compte_id ?? "",
  };
}

/** « tel:0123456789 » : le lien d'appel d'un numéro saisi avec espaces ou points. */
export function lienTelephone(telephone: string) {
  const plus = telephone.trim().startsWith("+") ? "+" : "";
  return `tel:${plus}${telephone.replace(/\D/g, "")}`;
}

/** « mailto:… » : le lien d'envoi d'un e-mail. */
export function lienEmail(email: string) {
  return `mailto:${email}`;
}

/** La lettre de la pastille quand la fiche n'a pas de photo. */
export function initialeFiche({ prenom }: Pick<FicheSyndic, "prenom" | "nom">) {
  return prenom.trim().charAt(0).toUpperCase();
}

/** « Nadia Benali ». */
export function nomFiche(fiche: Pick<FicheSyndic, "prenom" | "nom">) {
  return nomComplet(fiche);
}

const UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";

/** Le chemin d'une photo dans le bucket : son identifiant, toujours du JPEG (le format de la compression). */
export function cheminPhotoSyndic(photo: string) {
  return `${photo}.jpg`;
}

/** Vrai pour un chemin que `cheminPhotoSyndic` a pu produire : rien d'autre ne s'enregistre en base. */
export function estCheminPhotoSyndic(chemin: string) {
  return new RegExp(`^${UUID}\\.jpg$`).test(chemin);
}
