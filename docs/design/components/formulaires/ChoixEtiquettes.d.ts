export type EtiquetteActivite =
  | "acces_plain_pied"
  | "ascenseur"
  | "chaises_prevues"
  | "sieges_confortables"
  | "ambiance_calme"
  | "enfants_bienvenus"
  | "tous_ages"
  | "animaux_acceptes";

export interface ChoixEtiquettesProps {
  /** accessibilite : cinq étiquettes vertes · pour_qui : trois étiquettes abricot */
  groupe: "accessibilite" | "pour_qui";
  /** Toutes les étiquettes cochées, les deux groupes confondus, dans l'ordre des listes */
  valeurs: EtiquetteActivite[];
  onChange: (valeurs: EtiquetteActivite[]) => void;
}
export declare function ChoixEtiquettes(props: ChoixEtiquettesProps): JSX.Element;
