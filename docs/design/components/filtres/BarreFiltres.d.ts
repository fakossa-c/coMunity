export interface BarreFiltresProps {
  /** accueil : rangée qui défile sans barre visible sur mobile, puces qui passent à la ligne sur ordinateur · liste : 16 px (Activités) */
  variante?: "accueil" | "liste";
  /** Élément placé au-dessus des puces et qui colle avec elles (ex. <Onglets>) */
  avant?: React.ReactNode;
  /** Optionnel : sans puces, la barre ne colle que `avant` (Activités) */
  children?: React.ReactNode;
}
export declare function BarreFiltres(props: BarreFiltresProps): JSX.Element;
