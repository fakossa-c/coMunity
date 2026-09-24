/**
 * @startingPoint section="Actions" subtitle="Bouton pilule : action pêche, contour, danger, fantôme" viewport="700x300"
 */
export interface BoutonProps {
  /** action = pêche pastel (action principale) · contour = blanc bordé pêche · danger = annuler · fantome = barre de retour */
  variante?: "action" | "contour" | "danger" | "fantome";
  icone?: string;
  iconeTaille?: number;
  children?: React.ReactNode;
  pleineLargeur?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  style?: React.CSSProperties;
}
export declare function Bouton(props: BoutonProps): JSX.Element;
