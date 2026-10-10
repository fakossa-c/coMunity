/**
 * @startingPoint section="Actions" subtitle="Bouton pilule : action pêche, confirmer vert, contour, danger, fantôme" viewport="700x300"
 */
export interface BoutonProps {
  /** action = pêche pastel (action principale) · confirmer = vert pastel (confirmer une demande) · contour = blanc bordé pêche · neutre = blanc bordé `outline`, réservé à Annonces · danger = annuler, refuser, retirer · fantome = barre de retour */
  variante?: "action" | "confirmer" | "contour" | "neutre" | "danger" | "fantome";
  icone?: string;
  iconeTaille?: number;
  children?: React.ReactNode;
  pleineLargeur?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  style?: React.CSSProperties;
}
export declare function Bouton(props: BoutonProps): JSX.Element;
