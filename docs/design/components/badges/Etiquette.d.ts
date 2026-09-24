export interface EtiquetteProps {
  /** vert : accessibilité, confort · abricot : familles, enfants · peche : autre */
  ton?: "vert" | "abricot" | "peche";
  icone?: string;
  children: React.ReactNode;
}
export declare function Etiquette(props: EtiquetteProps): JSX.Element;
