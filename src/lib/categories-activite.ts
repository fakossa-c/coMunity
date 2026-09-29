import type { NomIcone } from "@/components/icones";

/**
 * Catégorie d'une activité, avec son libellé, son pictogramme par défaut et sa couleur.
 * Les classes sont écrites en entier : Tailwind ne repère que les noms qu'il lit dans le code.
 */
export const categoriesActivite = {
  moments_partages: {
    libelle: "Moments partagés",
    pictogramme: "waving_hand",
    couleur: {
      fond: "bg-categorie-moments-partages",
      encre: "text-on-categorie-moments-partages",
    },
  },
  creation_bricolage: {
    libelle: "Création & Bricolage",
    pictogramme: "handyman",
    couleur: {
      fond: "bg-categorie-creation-bricolage",
      encre: "text-on-categorie-creation-bricolage",
    },
  },
  culture_loisirs: {
    libelle: "Culture & Loisirs",
    pictogramme: "menu_book",
    couleur: {
      fond: "bg-categorie-culture-loisirs",
      encre: "text-on-categorie-culture-loisirs",
    },
  },
  entraide_partage: {
    libelle: "Entraide & Partage",
    pictogramme: "handshake",
    couleur: {
      fond: "bg-categorie-entraide-partage",
      encre: "text-on-categorie-entraide-partage",
    },
  },
  jardin_nature: {
    libelle: "Jardin & Nature",
    pictogramme: "potted_plant",
    couleur: {
      fond: "bg-categorie-jardin-nature",
      encre: "text-on-categorie-jardin-nature",
    },
  },
} as const satisfies Record<
  string,
  {
    libelle: string;
    pictogramme: NomIcone;
    couleur: { fond: string; encre: string };
  }
>;

export type CategorieActivite = keyof typeof categoriesActivite;

export const categoriesActiviteListe = Object.keys(
  categoriesActivite,
) as CategorieActivite[];

/** La couleur d'une catégorie : classes du fond pastel et de l'encre. */
export function couleurDe(categorie: CategorieActivite) {
  return categoriesActivite[categorie].couleur;
}

/** Le pictogramme d'une catégorie. */
export function pictogrammeDe(categorie: CategorieActivite): NomIcone {
  return categoriesActivite[categorie].pictogramme;
}

/**
 * Les pictogrammes qu'une activité peut porter en plus de celui de sa catégorie : ceux que Jev
 * peut suggérer, tous dans la bibliothèque de l'app.
 */
export const pictogrammesActivite = [
  "celebration",
  "child_care",
  "construction",
  "diversity_3",
  "forum",
  "groups",
  "handshake",
  "handyman",
  "interests",
  "kitchen",
  "menu_book",
  "park",
  "pets",
  "potted_plant",
  "table_restaurant",
  "waving_hand",
] as const satisfies readonly NomIcone[];

export type PictogrammeActivite = (typeof pictogrammesActivite)[number];
