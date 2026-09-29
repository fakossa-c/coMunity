export interface BarreGraphique { cle: string; libelle: string; valeur: number | null; texteValeur: string; detail?: string; }
export interface GraphiqueBarresProps { titre: string; resume: string; barres: BarreGraphique[]; maximum: number; }
export declare function GraphiqueBarres(props: GraphiqueBarresProps): JSX.Element;
