import type { NomIcone } from "@/components/icones";

/** Catégorie d'une activité, avec son libellé et son pictogramme par défaut. */
export const categoriesActivite = {
  moments_partages: { libelle: "Moments partagés", pictogramme: "waving_hand" },
  creation_bricolage: {
    libelle: "Création & Bricolage",
    pictogramme: "handyman",
  },
  culture_loisirs: { libelle: "Culture & Loisirs", pictogramme: "menu_book" },
  entraide_partage: { libelle: "Entraide & Partage", pictogramme: "handshake" },
  jardin_nature: { libelle: "Jardin & Nature", pictogramme: "potted_plant" },
} as const satisfies Record<string, { libelle: string; pictogramme: NomIcone }>;

export type CategorieActivite = keyof typeof categoriesActivite;

export const categoriesActiviteListe = Object.keys(
  categoriesActivite,
) as CategorieActivite[];

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
