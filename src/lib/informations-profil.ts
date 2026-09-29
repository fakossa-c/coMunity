/** Aligné sur la contrainte de `profil.pseudo` en base. */
export const LONGUEUR_MAXIMALE_PSEUDO = 50;

/** Les bâtiments de la résidence, tels qu'ils s'écrivent dans le profil. */
export const BATIMENTS = ["Bât. A", "Bât. B", "Bât. C", "Bât. D", "Bât. E"];

/** Les étages proposés : 0 est le rez-de-chaussée. */
export const ETAGES = Array.from({ length: 11 }, (_, etage) => etage);

/** Ce que le formulaire « Modifier mes informations » envoie, champ par champ, en texte. */
export type SaisieInformations = {
  pseudo: string;
  telephone: string;
  batiment: string;
  etage: string;
};

export type ChampInformations = keyof SaisieInformations;

/** Les champs du profil que la personne renseigne, tels que la base les enregistre. */
export type InformationsProfil = {
  pseudo: string;
  telephone: string | null;
  batiment: string | null;
  etage: number | null;
};

/** « Rez-de-chaussée », « 1er étage », « 2e étage ». */
export function libelleEtage(etage: number) {
  if (etage === 0) return "Rez-de-chaussée";
  return etage === 1 ? "1er étage" : `${etage}e étage`;
}

/** « Bât. B, 2e étage » ; ce qui est renseigné seulement, `undefined` sans rien. */
export function adresse(batiment: string | null, etage: number | null) {
  const parties = [batiment, etage === null ? null : libelleEtage(etage)];
  const dite = parties.filter(Boolean).join(", ");
  return dite || undefined;
}

type Visibilite = { visible: boolean; renseigne: boolean };

/**
 * L'encart de Mes informations : ce que les voisins voient, en une phrase. Le pseudo l'est toujours ;
 * le reste seulement s'il est rendu visible et renseigné (on ne promet pas ce qui n'existe pas).
 */
export function resumeVisibilite(champs: {
  telephone: Visibilite;
  batiment: Visibilite;
  etage: Visibilite;
}) {
  const vus = [
    "pseudo",
    ...(champs.telephone.visible && champs.telephone.renseigne
      ? ["téléphone"]
      : []),
    ...(champs.batiment.visible && champs.batiment.renseigne
      ? ["bâtiment"]
      : []),
    ...(champs.etage.visible && champs.etage.renseigne ? ["étage"] : []),
  ];
  const debut = vus.slice(0, -1).join(", ");
  const dit = debut ? `${debut} et ${vus.at(-1)}` : vus[0];
  return `Les voisins voient votre ${dit}.`;
}

const TELEPHONE = /^\+?[0-9][0-9 .-]{4,18}[0-9]$/;
const MESSAGE_TELEPHONE =
  "Saisissez un numéro de téléphone valide, par exemple 06 12 34 56 78.";

/**
 * Pourquoi les informations saisies (déjà débarrassées de leurs espaces) sont refusées, sous le
 * champ concerné ; `null` si elles conviennent. Téléphone, bâtiment et étage sont facultatifs.
 */
export function verifierInformations(
  saisie: SaisieInformations,
): { champ: ChampInformations; erreur: string } | null {
  const pseudo = saisie.pseudo.trim();
  if (!pseudo) return { champ: "pseudo", erreur: "Choisissez votre pseudo." };
  if (pseudo.length > LONGUEUR_MAXIMALE_PSEUDO) {
    return {
      champ: "pseudo",
      erreur: `Votre pseudo tient en ${LONGUEUR_MAXIMALE_PSEUDO} caractères au plus.`,
    };
  }
  const telephone = saisie.telephone.trim();
  if (telephone && !TELEPHONE.test(telephone)) {
    return { champ: "telephone", erreur: MESSAGE_TELEPHONE };
  }
  const batiment = saisie.batiment.trim();
  if (batiment && !BATIMENTS.includes(batiment)) {
    return {
      champ: "batiment",
      erreur: "Choisissez un bâtiment de la liste.",
    };
  }
  const etage = saisie.etage.trim();
  if (etage && !ETAGES.some((e) => String(e) === etage)) {
    return { champ: "etage", erreur: "Choisissez un étage de la liste." };
  }
  return null;
}

/** La mise à jour du profil pour une saisie qui a passé `verifierInformations`. */
export function versProfil(saisie: SaisieInformations): InformationsProfil {
  const telephone = saisie.telephone.trim();
  const batiment = saisie.batiment.trim();
  const etage = saisie.etage.trim();
  return {
    pseudo: saisie.pseudo.trim(),
    telephone: telephone || null,
    batiment: batiment || null,
    etage: etage ? Number(etage) : null,
  };
}
