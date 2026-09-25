export interface LigneMenuProps {
  icone: string;
  titre: string;
  /** Une ligne qui dit ce qu'on trouve derrière : « Contrôlez les informations partagées » */
  detail?: string;
  onClick?: () => void;
  /** carte : page Profil (72 px, blanc bordé) · feuille : dans le MenuProfil (64 px, bleu très clair) */
  variante?: "carte" | "feuille";
}
export declare function LigneMenu(props: LigneMenuProps): JSX.Element;
