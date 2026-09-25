export interface EtiquetteProps {
  /** vert : accessibilité, confort · abricot : familles, enfants · peche : autre · erreur : activité annulée */
  ton?: "vert" | "abricot" | "peche" | "erreur";
  icone?: string;
  children: React.ReactNode;
}
export declare function Etiquette(props: EtiquetteProps): JSX.Element;
