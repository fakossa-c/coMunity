export interface TitreSectionProps {
  children: React.ReactNode;
  /** Terre cuite : réservé à « Aujourd’hui » dans la liste par jour */
  accent?: boolean;
  style?: React.CSSProperties;
}
export declare function TitreSection(props: TitreSectionProps): JSX.Element;
