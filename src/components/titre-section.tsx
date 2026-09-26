import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
  /** Terre cuite : réservé à « Aujourd’hui » dans la liste par jour. */
  accent?: boolean;
  /** Pour nommer la section qu'il introduit (`aria-labelledby`). */
  id?: string;
};

/** Intertitre de section : un jour dans l'Accueil, un groupe de réglages. */
export function TitreSection({ children, accent = false, id }: Props) {
  return (
    <h2
      id={id}
      className={`font-headline text-headline-sm font-extrabold ${accent ? "text-primary" : "text-on-surface"}`}
    >
      {children}
    </h2>
  );
}
