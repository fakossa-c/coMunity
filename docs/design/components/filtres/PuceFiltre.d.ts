export interface PuceFiltreProps {
  /** Pictogramme affiché quand la puce n'est pas sélectionnée (remplacé par une coche sinon) */
  icone?: string;
  selectionnee?: boolean;
  /** Puce de catégorie : pictogramme 24 px en terre cuite */
  categorie?: boolean;
  children: React.ReactNode;
  onClick?: () => void;
}
export declare function PuceFiltre(props: PuceFiltreProps): JSX.Element;
