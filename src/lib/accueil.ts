import type { CategorieActivite } from "./categories-activite";

export function grouperParJour<
  T extends { date_activite: string; heure_debut: string },
>(
  _activites: T[],
  _aujourdhui: string,
): { date: string; titre: string; aujourdhui: boolean; activites: T[] }[] {
  throw new Error("À faire");
}

export function activitesDeLaSemaine(
  _activites: { date_activite: string; statut?: string }[],
  _aujourdhui: string,
): number {
  throw new Error("À faire");
}

export function resumeSemaine(_nombre: number): string {
  throw new Error("À faire");
}

export function horaire(_debut: string, _fin: string): string {
  throw new Error("À faire");
}

export function categorieFiltree(_valeur?: string): CategorieActivite | null {
  throw new Error("À faire");
}
