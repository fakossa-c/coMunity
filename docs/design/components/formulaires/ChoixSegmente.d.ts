export interface ChoixSegmenteProps {
  /** visuel : élément libre au-dessus du libellé (ex. un « A » à la taille réelle), sinon icone */
  options: { id: string; libelle: string; icone?: string; visuel?: React.ReactNode }[];
  valeur: string;
  onChange?: (id: string) => void;
  /** Nom du groupe pour le lecteur d'écran */
  libelle: string;
}
export declare function ChoixSegmente(props: ChoixSegmenteProps): JSX.Element;
