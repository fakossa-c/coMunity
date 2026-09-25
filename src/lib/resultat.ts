/** Issue d'une action serveur, affichée telle quelle à la personne. */
export type Resultat = { ok: boolean; message: string };

/**
 * Erreur d'un formulaire : sous le champ nommé par `champ`, sinon en tête du formulaire.
 * `C` liste les champs (attribut `name`) auxquels une erreur peut se rapporter.
 */
export type ErreurFormulaire<C extends string> = {
  erreur?: string;
  champ?: C;
};

/** L'erreur à afficher sous `champ`, s'il est celui qu'elle concerne. */
export function erreurDuChamp<C extends string>(
  etat: ErreurFormulaire<C>,
  champ: C,
) {
  return etat.champ === champ ? etat.erreur : undefined;
}

/** L'erreur à afficher en tête du formulaire : celle qui ne vise aucun champ. */
export function erreurGenerale(etat: ErreurFormulaire<string>) {
  return etat.champ ? undefined : etat.erreur;
}
