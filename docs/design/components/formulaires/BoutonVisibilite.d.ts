export interface BoutonVisibiliteProps {
  /** Vrai : « Visible » ; faux : « Masqué » sur mobile, « Privé » sur ordinateur (176 px) */
  visible: boolean;
  /** Information toujours visible (pseudo) : cadenas, non cliquable */
  verrou?: boolean;
  onClick?: () => void;
  /** Nom de l'information, pour le lecteur d'écran (« Téléphone ») */
  libelle: string;
}
export declare function BoutonVisibilite(props: BoutonVisibiliteProps): JSX.Element;
