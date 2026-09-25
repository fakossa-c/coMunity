import { BoutonRond } from "./bouton-rond";

type Props = {
  valeur: number;
  onChange: (valeur: number) => void;
  min?: number;
  /** Pas de limite si absent : la fiche la fixe aux places restantes. */
  max?: number;
  /** Décrit ce que compte le compteur, pour les lecteurs d'écran. */
  label: string;
};

/** Stepper « − N + » : le nombre d'accompagnants, à côté du bouton d'inscription. */
export function Compteur({ valeur, onChange, min = 0, max, label }: Props) {
  return (
    <div
      role="group"
      aria-label={label}
      className="flex items-center gap-space-sm"
    >
      <BoutonRond
        label={`Retirer un accompagnant`}
        icone="remove"
        disabled={valeur <= min}
        onClick={() => onChange(valeur - 1)}
      />
      <span
        aria-live="polite"
        className="w-6 text-center font-headline text-headline-sm text-on-surface"
      >
        {valeur}
      </span>
      <BoutonRond
        label={`Ajouter un accompagnant`}
        icone="add"
        disabled={max != null && valeur >= max}
        onClick={() => onChange(valeur + 1)}
      />
    </div>
  );
}
