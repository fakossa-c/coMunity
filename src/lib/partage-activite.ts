export type ActivitePartagee = {
  titre: string;
  pictogramme: string;
  date_activite: string;
  heure_debut: string;
  heure_fin: string;
  lieu: string;
  placesRestantes?: number | null;
};

export function jourLong(date: string): string {
  throw new Error(`à écrire : ${date}`);
}

export function creneau(debut: string, fin: string): string {
  throw new Error(`à écrire : ${debut} ${fin}`);
}

export function placesRestantes(nombre: number): string {
  throw new Error(`à écrire : ${nombre}`);
}

export function messageWhatsApp(
  activite: ActivitePartagee,
  lien: string,
): string {
  throw new Error(`à écrire : ${activite.titre} ${lien}`);
}

export function lienWhatsApp(message: string): string {
  throw new Error(`à écrire : ${message}`);
}
