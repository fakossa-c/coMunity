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
  children: ReactNode;
};

/**
 * Cadre d'un écran : en-tête, contenu qui défile, barres fixées en bas. Sur ordinateur, le
 * contenu, comme la barre du haut, suit le conteneur de 1280 px aux marges de 64 px, identique
 * sur toutes les pages.
 */
export function Ecran({
  haut,
  barreBas,
  flottant,
  paddingBas = barreBas ? 180 : 40,
  paddingBasBureau = paddingBas,
  children,
}: Props) {
  return (
    <div className="flex flex-1 flex-col">
      {haut}
      <main
        id="contenu"
        tabIndex={-1}
        style={
          {
            "--reserve-bas": `${paddingBas}px`,
            "--reserve-bas-bureau": `${paddingBasBureau}px`,
          } as React.CSSProperties
        }
        className="mx-auto w-full max-w-conteneur flex-1 px-margin pt-space-sm pb-[calc(var(--reserve-bas)+env(safe-area-inset-bottom))] desktop:px-marge-journal desktop:pt-5 desktop:pb-[calc(var(--reserve-bas-bureau)+env(safe-area-inset-bottom))]"
      >
        {children}
      </main>
      {flottant}
      {barreBas}
    </div>
  );
}
