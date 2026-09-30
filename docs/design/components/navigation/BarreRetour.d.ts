export interface BarreRetourProps {
  /** Où mène « Retour » : dite aux lecteurs d'écran (« Retour : Profil »), jamais affichée. Le libellé visible est toujours « Retour ». */
  destination: string;
  onRetour?: () => void;
  /** null pour masquer « Partager » */
  onPartager?: (() => void) | null;
  /** Affiche aussi l'avatar profil (présents sur tous les écrans) */
  initiale?: string;
  onProfil?: () => void;
}
export declare function BarreRetour(props: BarreRetourProps): JSX.Element;
