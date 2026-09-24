export interface BoutonRondProps {
  /** contour : « +A », stepper · marine : avatar du profil dans l'en-tête */
  variante?: "contour" | "marine";
  /** Obligatoire : décrit l'action (lecteur d'écran) */
  label: string;
  icone?: string;
  children?: React.ReactNode;
  disabled?: boolean; actif?: boolean;
  onClick?: () => void;
  style?: React.CSSProperties;
}
export declare function BoutonRond(props: BoutonRondProps): JSX.Element;
