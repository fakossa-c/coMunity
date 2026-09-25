import type { NomIcone } from "@/components/icones";

/** Les deux listes fermées d'étiquettes d'une activité : accessibilité, puis pour qui. */
export const groupesEtiquettes = {
  accessibilite: { titre: "Accessibilité", ton: "vert" },
  pour_qui: { titre: "Pour qui", ton: "abricot" },
} as const satisfies Record<string, { titre: string; ton: "vert" | "abricot" }>;

export type GroupeEtiquettes = keyof typeof groupesEtiquettes;

/** Une étiquette par valeur de l'énumération `etiquette_activite` en base, dans l'ordre des listes. */
export const etiquettesActivite = {
  acces_plain_pied: {
    libelle: "Accès plain-pied",
    icone: "accessible",
    groupe: "accessibilite",
  },
  ascenseur: {
    libelle: "Ascenseur",
    icone: "elevator",
    groupe: "accessibilite",
  },
  chaises_prevues: {
    libelle: "Chaises prévues",
    icone: "chair",
    groupe: "accessibilite",
  },
  sieges_confortables: {
    libelle: "Sièges confortables",
    icone: "weekend",
    groupe: "accessibilite",
  },
  ambiance_calme: {
    libelle: "Ambiance calme",
    icone: "volume_off",
    groupe: "accessibilite",
  },
  enfants_bienvenus: {
    libelle: "Enfants bienvenus",
    icone: "child_care",
    groupe: "pour_qui",
  },
  tous_ages: {
    libelle: "Tous âges",
    icone: "family_restroom",
    groupe: "pour_qui",
  },
  animaux_acceptes: {
    libelle: "Animaux acceptés",
    icone: "pets",
    groupe: "pour_qui",
  },
} as const satisfies Record<
  string,
  { libelle: string; icone: NomIcone; groupe: GroupeEtiquettes }
>;

export type EtiquetteActivite = keyof typeof etiquettesActivite;

export const etiquettesActiviteListe = Object.keys(
  etiquettesActivite,
) as EtiquetteActivite[];

/** Les étiquettes d'un groupe, dans l'ordre de la liste. */
export function etiquettesDuGroupe(groupe: GroupeEtiquettes) {
  return etiquettesActiviteListe.filter(
    (cle) => etiquettesActivite[cle].groupe === groupe,
  );
}

/** Le ton de pastille d'une étiquette : celui de son groupe. */
export function tonEtiquette(cle: EtiquetteActivite) {
  return groupesEtiquettes[etiquettesActivite[cle].groupe].ton;
}
