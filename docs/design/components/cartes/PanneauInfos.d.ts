export interface PanneauInfosProps {
  lignes: { icone: string; titre: string; detail?: string }[];
  inscrits?: number;
  places?: number;
}
export declare function PanneauInfos(props: PanneauInfosProps): JSX.Element;
