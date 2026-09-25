export interface ChampProps {
  libelle: string;
  /** Texte d'aide sous le champ : « 8 caractères minimum. » */
  aide?: string;
  valeur?: string;
  type?: string;
  autoComplete?: string;
  inputMode?: string;
  /** Mot de passe : masqué, bouton « Afficher / Masquer » intégré */
  secret?: boolean;
  /** Liste fermée : rend un <select> */
  options?: string[];
  onChange?: (valeur: string) => void;
}
export declare function Champ(props: ChampProps): JSX.Element;
