/**
 * @startingPoint section="Navigation" subtitle="Menu du profil : feuille du bas ouverte par l'avatar" viewport="390x620"
 */
export interface MenuProfilProps {
  ouvert: boolean;
  onFermer?: () => void;
  /** Reçoit l'id de la rubrique touchée (la feuille se ferme d'elle-même) */
  onChoisir?: (id: string) => void;
  initiale: string;
  nom: string;
  adresse?: string;
  /** Par défaut : Profil, Mon syndic, Ma copro */
  rubriques?: { id: string; icone: string; titre: string; detail?: string }[];
}
export declare function MenuProfil(props: MenuProfilProps): JSX.Element;
