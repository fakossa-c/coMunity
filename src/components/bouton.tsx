import type { ComponentProps } from "react";
import { Icone, type TailleIcone } from "./icone";
import type { NomIcone } from "./icones";

const variantes = {
  /** Action principale, en pêche pastel. */
  action:
    "min-h-bouton gap-2 px-5 bg-fond-action text-texte-action hover:bg-primary-fixed-dim",
  contour:
    "min-h-bouton gap-2 px-5 border-2 border-contour-action bg-fond-carte text-on-surface hover:bg-surface-container-low",
  /** Annuler, supprimer. */
  danger:
    "min-h-bouton gap-1.5 px-5 border-2 border-error bg-fond-carte text-error hover:bg-error-container",
  /** Barre de retour, action discrète dans une ligne. */
  fantome:
    "min-h-cible gap-1.5 px-3.5 bg-transparent text-on-surface hover:bg-surface-container-low",
};

export type VarianteBouton = keyof typeof variantes;

export type PropsBouton = ComponentProps<"button"> & {
  variante?: VarianteBouton;
  icone?: NomIcone;
  iconeTaille?: TailleIcone;
  pleineLargeur?: boolean;
};

/** Classes d'un bouton du design system, pour un lien qui en prend l'apparence. */
export function classesBouton(
  variante: VarianteBouton = "action",
  pleineLargeur = false,
) {
  return `inline-flex items-center justify-center rounded-full text-center font-headline text-label-lg transition-transform active:translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50 ${variantes[variante]} ${pleineLargeur ? "w-full" : ""}`;
}

/** Bouton en pilule du design system : 56 px de haut, 52 px en variante fantôme. */
export function Bouton({
  variante = "action",
  icone,
  iconeTaille = 24,
  pleineLargeur = false,
  className,
  children,
  ...props
}: PropsBouton) {
  return (
    <button
      type="button"
      className={`${classesBouton(variante, pleineLargeur)} ${className ?? ""}`}
      {...props}
    >
      {icone && <Icone nom={icone} taille={iconeTaille} />}
      {children}
    </button>
  );
}
