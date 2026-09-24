export interface BarreNavigationProps {
  actif?: string;
  onChange?: (id: string) => void;
  onglets?: { id: string; libelle: string; icone: string }[];
}
export declare function BarreNavigation(props: BarreNavigationProps): JSX.Element;
