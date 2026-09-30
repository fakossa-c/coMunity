export interface BarreNavigationProps {
  actif?: string;
  onChange?: (id: string) => void;
  onglets?: { id: string; libelle: string; icone: string }[];
  /** Membre actif du conseil syndical : ajoute l'onglet « Tableau de bord » (« Syndic » en bas) */
  syndic?: boolean;
}
export declare function BarreNavigation(props: BarreNavigationProps): JSX.Element;
