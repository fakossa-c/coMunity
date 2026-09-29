export interface CalendrierProps {
  /** Nom du champ, lu par le lecteur d'écran : « Date » */
  libelle: string;
  /** Jour choisi, AAAA-MM-JJ ; "" avant tout choix */
  valeur: string;
  onChange: (date: string) => void;
  /** Aujourd'hui, AAAA-MM-JJ : les jours d'avant sont grisés et désactivés */
  aujourdhui: string;
  /** Texte d'aide sous le calendrier */
  aide?: string;
  /** Erreur sous le calendrier, annoncée ; bordure error */
  erreur?: string;
}
export declare function Calendrier(props: CalendrierProps): JSX.Element;
