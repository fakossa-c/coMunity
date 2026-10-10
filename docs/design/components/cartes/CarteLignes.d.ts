export interface CarteLignesProps {
  /** titre = libellé discret (« E-mail »), detail = valeur en gras, fin = action à droite (Bouton fantôme « Modifier », BoutonVisibilite) ; en tête, un pictogramme (`icone`) ou, pour une liste de personnes, un `avatar` (Avatar de 52 px), jamais les deux */
  lignes: ({ cle?: string; titre: string; detail?: string; fin?: React.ReactNode } & (
    | { icone: string; avatar?: never }
    | { avatar: React.ReactNode; icone?: never }
  ))[];
}
export declare function CarteLignes(props: CarteLignesProps): JSX.Element;
