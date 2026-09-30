import type { ReactNode } from "react";

type Props = {
  /** EnTeteResidence ou BarreRetour (mobile) et BarreHaute (ordinateur). */
  haut: ReactNode;
  /** BarreNavigation `bas` ou BarreActionFixe, fixée en bas. */
  barreBas?: ReactNode;
  /** BoutonFlottant, au-dessus de la barre du bas ; mobile seulement. */
  flottant?: ReactNode;
  /**
   * Réserve en px sous le contenu, pour qu'aucune barre ne le masque : 180 avec la navigation du
   * bas, 170 avec une barre d'action, 40 sans barre. La zone de sécurité iOS s'y ajoute.
   */
  paddingBas?: number;
  /** Réserve sur ordinateur, où la navigation est dans l'en-tête ; par défaut, celle du mobile. */
  paddingBasBureau?: number;
  /**
   * Menu de l'espace syndic, collé au bord gauche sur ordinateur : le contenu, de 1152 px au
   * plus, se centre alors dans l'espace restant.
   */
  menu?: ReactNode;
  children: ReactNode;
};

/**
 * Cadre d'un écran : en-tête, contenu qui défile, barres fixées en bas. Sur ordinateur, le
 * contenu, comme la barre du haut, suit le conteneur de 1280 px aux marges de 64 px, identique
 * sur toutes les pages ; à côté du menu de l'espace syndic, il se centre dans l'espace restant.
 */
export function Ecran({
  haut,
  barreBas,
  flottant,
  paddingBas = barreBas ? 180 : 40,
  paddingBasBureau = paddingBas,
  menu,
  children,
}: Props) {
  const contenu = (
    <main
      id="contenu"
      tabIndex={-1}
      style={
        {
          "--reserve-bas": `${paddingBas}px`,
          "--reserve-bas-bureau": `${paddingBasBureau}px`,
        } as React.CSSProperties
      }
      className={`mx-auto w-full flex-1 px-margin pt-space-sm pb-[calc(var(--reserve-bas)+env(safe-area-inset-bottom))] desktop:pt-5 desktop:pb-[calc(var(--reserve-bas-bureau)+env(safe-area-inset-bottom))] ${menu ? "max-w-conteneur min-w-0 desktop:max-w-contenu-syndic desktop:px-margin-desktop" : "max-w-conteneur desktop:px-marge-journal"}`}
    >
      {children}
    </main>
  );

  return (
    <div className="flex flex-1 flex-col">
      {haut}
      {menu ? (
        <div className="flex flex-1">
          {menu}
          {contenu}
        </div>
      ) : (
        contenu
      )}
      {flottant}
      {barreBas}
    </div>
  );
}
