import type { ReactNode } from "react";

type Props = {
  /** EnTeteResidence, qui défile, ou BarreRetour, qui colle en haut. */
  haut: ReactNode;
  /** BarreActionFixe, fixée en bas (la navigation vit dans l'en-tête de résidence). */
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
  /** Espace syndic : sur ordinateur, le cadre prend toute la largeur au lieu de la colonne. */
  pleineLargeur?: boolean;
  children: ReactNode;
};

/**
 * Cadre d'un écran : en-tête, contenu qui défile, barres fixées en bas. Sur ordinateur, tout
 * suit la colonne centrée (`--largeur-colonne`), sauf `pleineLargeur`.
 */
export function Ecran({
  haut,
  barreBas,
  flottant,
  paddingBas = barreBas ? 180 : 40,
  paddingBasBureau = paddingBas,
  pleineLargeur = false,
  children,
}: Props) {
  return (
    <div
      data-largeur={pleineLargeur ? "pleine" : undefined}
      className="flex flex-1 flex-col"
    >
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
        className="mx-auto w-full max-w-(--largeur-colonne) flex-1 px-margin pt-space-sm pb-[calc(var(--reserve-bas)+env(safe-area-inset-bottom))] desktop:px-margin-desktop desktop:pb-[calc(var(--reserve-bas-bureau)+env(safe-area-inset-bottom))]"
      >
        {children}
      </main>
      {flottant}
      {barreBas}
    </div>
  );
}
