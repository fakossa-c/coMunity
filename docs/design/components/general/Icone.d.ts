export interface IconeProps {
  /** Nom Material Symbols Rounded (ex. "celebration", "location_on") */
  nom: string;
  /** Glyphe plein : onglet actif, statut confirmé */
  plein?: boolean;
  /** Taille en px : 20 badge, 22 puce/catégorie, 24 défaut, 26 panneau/nav, 28 retour/flottant */
  taille?: number;
  couleur?: string;
  style?: React.CSSProperties;
}
export declare function Icone(props: IconeProps): JSX.Element;
