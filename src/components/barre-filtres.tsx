import type { ReactNode } from "react";

type Props = {
  /** Onglets qui précèdent la rangée de puces et collent avec elle, dans le même bloc. */
  avant?: ReactNode;
  /** accueil : défilement horizontal, 12/20 px. liste : 16 px (Activités). */
  variante?: "accueil" | "liste";
  children: ReactNode;
};

/**
 * Rangée de puces collante (sticky top 0, fond de page). Toute barre de filtres, actuelle ou
 * future, colle en haut de l'écran ; les onglets passés via `avant` collent avec elle.
 */
export function BarreFiltres({ avant, variante = "accueil", children }: Props) {
  return (
    <div className="sticky top-0 z-20 -mx-margin flex flex-col gap-space-sm bg-fond-page px-margin pt-[env(safe-area-inset-top)] pb-space-sm">
      {avant}
      <div
        className={
          variante === "liste"
            ? "flex gap-4"
            : "flex gap-3 overflow-x-auto pb-1"
        }
      >
        {children}
      </div>
    </div>
  );
}
