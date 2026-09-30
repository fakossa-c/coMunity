export interface OngletsProps {
  onglets: { id: string; libelle: string; href: string; icone: string; /** Nombre d'éléments du segment, dans une pastille blanche */ compteur: number }[];
  actif: string;
  /** Nom du groupe pour le lecteur d'écran */
  libelleGroupe: string;
}
export declare function Onglets(props: OngletsProps): JSX.Element;
