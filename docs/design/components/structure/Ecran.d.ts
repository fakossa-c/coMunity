/**
 * @startingPoint section="Structure" subtitle="Écran mobile : zone qui défile, barre du bas fixe, bouton flottant" viewport="390x844"
 */
export interface EcranProps {
  /** Contenu qui défile. Les enfants collants (BarreFiltres, BarreRetour) s'accrochent en haut de cette zone. */
  children: React.ReactNode;
  /** BarreNavigation ou BarreActionFixe, fixée en bas */
  barreBas?: React.ReactNode;
  /** BoutonFlottant, à 20 px du bord droit et 100 px du bas */
  flottant?: React.ReactNode;
  /** Réserve en bas de la zone qui défile : 180 avec la navigation, 170 avec une barre d'action */
  paddingBas?: number;
  /** Texte de la barre d'état simulée (ex. "9:41") ; elle défile avec le contenu */
  barreEtat?: string | null;
  style?: React.CSSProperties;
}
export declare function Ecran(props: EcranProps): JSX.Element;
