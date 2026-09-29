const A_ECRIRE = () => {
  throw new Error("pas encore écrit");
};
export const moisDe = A_ECRIRE as (date: string) => string;
export const moisDecale = A_ECRIRE as (
  mois: string,
  decalage: number,
) => string;
export const libelleMois = A_ECRIRE as (mois: string) => string;
export const semainesDuMois = A_ECRIRE as (mois: string) => (string | null)[][];
export const jourDecale = A_ECRIRE as (date: string, jours: number) => string;
export const debutDeSemaine = A_ECRIRE as (date: string) => string;
export const finDeSemaine = A_ECRIRE as (date: string) => string;
export const libelleJour = A_ECRIRE as (date: string) => string;
