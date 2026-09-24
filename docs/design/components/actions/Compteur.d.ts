export interface CompteurProps { libelle?: string; valeur: number; min?: number; max?: number; onChange?: (n: number) => void; }
export declare function Compteur(props: CompteurProps): JSX.Element;
