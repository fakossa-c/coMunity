export interface BarreFiltresProps {
  /** accueil : défilement horizontal, 12/20 px · liste : 16 px (Activités) */
  variante?: "accueil" | "liste";
  /** Élément placé au-dessus des puces et qui colle avec elles (ex. <Onglets>) */
  avant?: React.ReactNode;
  children: React.ReactNode;
}
export declare function BarreFiltres(props: BarreFiltresProps): JSX.Element;
