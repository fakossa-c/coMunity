export interface OngletsProps { onglets: { id: string; libelle: string }[]; actif: string; onChange?: (id: string) => void; }
export declare function Onglets(props: OngletsProps): JSX.Element;
