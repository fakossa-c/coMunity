import type { ReactNode } from "react";

type Props = {
  /** Onglets qui précèdent la rangée de puces et collent avec elle, dans le même bloc. */
  avant?: ReactNode;
  variante?: "defaut" | "liste";
  children: ReactNode;
};

/**
 * Rangée de puces collante (sticky top 0, fond de page). Toute barre de filtres, actuelle ou
 * future, colle en haut de l'écran ; les onglets passés via `avant` collent avec elle.
 */
export function BarreFiltres({ avant, variante = "defaut", children }: Props) {
  return (
    <div className="sticky top-0 z-20 -mx-margin flex flex-col gap-space-sm bg-fond-page px-margin pb-space-sm pt-[env(safe-area-inset-top)]">
      {avant}
      <div
        className={`flex gap-2.5 ${variante === "liste" ? "" : "overflow-x-auto"}`}
      >
        {children}
      </div>
    </div>
  );
}
