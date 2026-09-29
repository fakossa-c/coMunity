export const BUCKET_PHOTOS_ACTIVITE = "activites";
export const MAX_PHOTOS = 5;

export function cheminPhoto(_activite: string, _photo: string): string {
  throw new Error("à écrire");
}

export function estCheminPhoto(_chemin: string, _activite: string): boolean {
  throw new Error("à écrire");
}

export function urlPhoto(_urlSupabase: string, _chemin: string): string {
  throw new Error("à écrire");
}

export function compteurPhoto(_rang: number, _total: number): string {
  throw new Error("à écrire");
}

export function texteAlternatif(
  _titre: string,
  _rang: number,
  _total: number,
): string {
  throw new Error("à écrire");
}

export function mettreEnPremier<T>(_liste: T[], _index: number): T[] {
  throw new Error("à écrire");
}

export function retirerPhoto<T>(_liste: T[], _index: number): T[] {
  throw new Error("à écrire");
}
