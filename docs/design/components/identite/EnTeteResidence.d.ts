export interface EnTeteResidenceProps {
  residence: string;
  /** Initiale de la personne connectée : avatar marine qui ouvre le MenuProfil */
  initiale: string;
  onProfil?: () => void;
}
export declare function EnTeteResidence(props: EnTeteResidenceProps): JSX.Element;
