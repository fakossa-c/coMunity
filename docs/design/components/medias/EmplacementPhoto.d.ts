export interface EmplacementPhotoProps {
  /** Légende de l'emplacement (ex. "photo · goûter au jardin") */
  legende?: string;
  /** 128 dans une carte, 150 en tête de fiche */
  hauteur?: number;
  /** true en tête de fiche (rayon 16), false en haut de carte */
  arrondi?: boolean;
  /** Pastille « 1 sur 4 » */
  compteur?: string;
  src?: string;
  style?: React.CSSProperties;
}
export declare function EmplacementPhoto(props: EmplacementPhotoProps): JSX.Element;
