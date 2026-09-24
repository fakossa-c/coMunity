export interface LogoProps {
  /** couleur : terre cuite + menthe sur fond clair · inverse : blanc + menthe sur terre cuite ou marine */
  variante?: "couleur" | "inverse";
  /** Hauteur en px (largeur = hauteur × 4,41). 24 dans l'en-tête, 16 minimum */
  hauteur?: number;
  style?: React.CSSProperties;
}
export declare function Logo(props: LogoProps): JSX.Element;
