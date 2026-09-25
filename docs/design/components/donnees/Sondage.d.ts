export interface SondageProps {
  question: string;
  options: { libelle: string; votes?: number }[];
  /** Nombre de réponses affiché (sinon somme des votes) */
  reponses?: number;
  /** "30 octobre" → « jusqu'au 30 octobre » */
  echeance?: string;
  /** Index déjà voté : affiche directement les résultats */
  choix?: number | null;
  onVoter?: (index: number) => void;
}
export declare function Sondage(props: SondageProps): JSX.Element;
