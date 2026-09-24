/**
 * @startingPoint section="Cartes" subtitle="Annonce du syndic : AG, sondage, travaux, information" viewport="700x900"
 */
export interface CarteAnnonceProps {
  /** Pastille et libellé : ag (pêche), sondage (abricot), travaux / info (vert) */
  type?: "ag" | "sondage" | "travaux" | "info";
  /** "Publiée le 18 oct. par le syndic" */
  publiee?: string;
  titre: string;
  texte?: string;
  /** Lignes icône + titre en gras + détail (date, lieu, période) */
  infos?: { icone: string; titre: string; detail?: string }[];
  /** Étiquette pêche « Nouveau » */
  nouvelle?: boolean;
  /** Bloc spécifique, ex. <Sondage> */
  children?: React.ReactNode;
  /** Boutons empilés en bas de carte */
  actions?: React.ReactNode;
}
export declare function CarteAnnonce(props: CarteAnnonceProps): JSX.Element;
