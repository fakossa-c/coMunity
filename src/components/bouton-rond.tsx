import type { ComponentProps } from "react";
import { Icone } from "./icone";
import type { NomIcone } from "./icones";

const variantes = {
  /** Stepper, réglages. */
  contour:
    "border-2 border-contour-action bg-fond-carte text-on-surface hover:bg-surface-container-low",
  /** Avatar de la personne connectée, dans l'en-tête. */
  marine: "bg-inverse-surface text-inverse-on-surface",
};

type Props = ComponentProps<"button"> & {
  variante?: keyof typeof variantes;
  /** Obligatoire : décrit l'action pour un lecteur d'écran. */
  label: string;
  icone?: NomIcone;
};

/** Bouton rond de 52 × 52 px : avatar du profil, stepper. */
export function BoutonRond({
  variante = "contour",
  label,
  icone,
  className,
  children,
  ...props
}: Props) {
  return (
    <button
      type="button"
      aria-label={label}
      className={`inline-flex size-cible shrink-0 items-center justify-center rounded-full font-headline text-headline-sm font-extrabold disabled:cursor-not-allowed disabled:opacity-50 ${variantes[variante]} ${className ?? ""}`}
      {...props}
    >
      {icone ? <Icone nom={icone} taille={24} /> : children}
    </button>
  );
}
