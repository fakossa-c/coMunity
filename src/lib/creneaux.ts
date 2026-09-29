const A_ECRIRE = () => {
  throw new Error("pas encore écrit");
};
export const optionsDebut = A_ECRIRE as (actuelle: string) => string[];
export const optionsFin = A_ECRIRE as (
  debut: string,
  actuelle: string,
) => string[];
export const finApresDebut = A_ECRIRE as (
  debut: string,
  fin: string,
  finChoisie: boolean,
) => string;
export const libelleHeure = A_ECRIRE as (heure: string) => string;
