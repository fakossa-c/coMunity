export interface CarteLignesProps {
  /** titre = libellé discret (« E-mail »), detail = valeur en gras, fin = action à droite (Bouton fantôme « Modifier », BoutonVisibilite) */
  lignes: { cle?: string; icone: string; titre: string; detail?: string; fin?: React.ReactNode }[];
}
export declare function CarteLignes(props: CarteLignesProps): JSX.Element;
