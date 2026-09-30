import type { ReactNode } from "react";

type Props = {
  /** Onglets qui précèdent la rangée de puces et collent avec elle, dans le même bloc. */
  avant?: ReactNode;
  /**
   * accueil : sur mobile, une rangée qui défile au doigt sans barre visible ; sur ordinateur, des
   * puces qui passent à la ligne. liste : 16 px (Activités).
   */
  variante?: "accueil" | "liste";
  /** Nom de la barre, qui devient alors une navigation (« Catégories » sur l'Accueil). */
  libelle?: string;
  /** Sans puces (Activités : des segments seuls), la barre ne colle que ce qui la précède. */
  children?: ReactNode;
};

/**
 * Rangée de puces collante (sticky top 0, fond de page). Toute barre de filtres, actuelle ou
 * future, colle en haut de l'écran ; les onglets passés via `avant` collent avec elle.
 */
export function BarreFiltres({
  avant,
  variante = "accueil",
  libelle,
  children,
}: Props) {
  const Conteneur = libelle ? "nav" : "div";
  return (
    <Conteneur
      aria-label={libelle}
      className="sticky top-0 z-20 -mx-margin flex flex-col gap-space-sm bg-fond-page px-margin pt-[env(safe-area-inset-top)] pb-space-sm"
    >
      {avant}
      {children && (
        <div
          className={
            variante === "liste"
              ? "flex gap-4"
              : "flex [scrollbar-width:none] gap-3 overflow-x-auto pb-1 desktop:flex-wrap desktop:overflow-visible [&::-webkit-scrollbar]:hidden"
          }
        >
          {children}
        </div>
      )}
    </Conteneur>
  );
}
