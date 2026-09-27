export interface SalutationProps {
  /** Absent (visiteur, membre du conseil syndical sans prénom) : « Bonjour ! » */
  prenom?: string;
  /** Adresse « Bât. B, 2e étage. ». Abandonnée le 23/09/2026 : bâtiment et étage ne sont plus demandés
   *  à l'inscription. */
  adresse?: string;
  resume?: string;
}
export declare function Salutation(props: SalutationProps): JSX.Element;
