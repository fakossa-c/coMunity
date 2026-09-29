export type Morceau = { texte: string; gras: boolean };
export type Bloc =
  | { type: "paragraphe"; morceaux: Morceau[] }
  | { type: "liste"; elements: Morceau[][] };

export type SaisieSection = { titre: string; texte: string };
export type ChampSection = keyof SaisieSection;

export function decouperTexte(_texte: string): Bloc[] {
  throw new Error("à écrire");
}

export function verifierSection(_saisie: SaisieSection): {
  champ?: ChampSection;
  erreur?: string;
} {
  throw new Error("à écrire");
}

export function versSection(_saisie: SaisieSection): SaisieSection {
  throw new Error("à écrire");
}

export function dateReglement(_iso: string): string {
  throw new Error("à écrire");
}
