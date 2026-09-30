export interface LigneArchiveeProps {
  /** organisee : « Organisée par vous », participants et « Dupliquer » · suivie : « Vous y avez participé » et « Donner mon avis » */
  role: "organisee" | "suivie";
  titre: string;
  /** « Jeudi 15 octobre » */
  jour: string;
  lieu: string;
  pictogramme: string;
  /** Rôle organisee : nombre de participants, accompagnants compris */
  participants?: number;
  /** Rôle organisee : ajoute « Annulée » à la place du nombre de participants */
  annulee?: boolean;
}
export declare function LigneArchivee(props: LigneArchiveeProps): JSX.Element;
