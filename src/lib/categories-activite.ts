import type { NomIcone } from "@/components/icones";

/** Catégorie d'une activité, avec son libellé et son pictogramme par défaut. */
export const categoriesActivite = {
  moments_partages: { libelle: "Moments partagés", pictogramme: "waving_hand" },
  creation_bricolage: { libelle: "Création & Bricolage", pictogramme: "handyman" },
  culture_loisirs: { libelle: "Culture & Loisirs", pictogramme: "menu_book" },
  entraide_partage: { libelle: "Entraide & Partage", pictogramme: "handshake" },
  jardin_nature: { libelle: "Jardin & Nature", pictogramme: "potted_plant" },
} as const satisfies Record<string, { libelle: string; pictogramme: NomIcone }>;

export type CategorieActivite = keyof typeof categoriesActivite;

export const categoriesActiviteListe = Object.keys(
  categoriesActivite,
) as CategorieActivite[];

/** Les pictogrammes disponibles pour une catégorie donnée. */
export function pictogrammesDe(categorie: CategorieActivite): NomIcone[] {
  return [categoriesActivite[categorie].pictogramme];
}
