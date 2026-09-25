import type { ReactNode } from "react";

type Props = {
  /** EnTeteResidence, qui défile, ou BarreRetour, qui colle en haut. */
  haut: ReactNode;
  /** BarreNavigation ou BarreActionFixe, fixée en bas. */
  barreBas?: ReactNode;
  /** BoutonFlottant, au-dessus de la barre du bas. */
  flottant?: ReactNode;
  /**
   * Réserve en px sous le contenu, pour qu'aucune barre ne le masque : 180 avec la navigation
   * (par défaut quand une barre est présente), 170 avec une barre d'action, 40 sans barre.
   * La zone de sécurité iOS s'y ajoute.
   */
  paddingBas?: number;
  children: ReactNode;
};

/** Cadre d'un écran : en-tête, contenu qui défile, barres fixées en bas. */
export function Ecran({
  haut,
  barreBas,
  flottant,
  paddingBas = barreBas ? 180 : 40,
  children,
}: Props) {
  return (
    <>
      {haut}
      <main
        id="contenu"
        tabIndex={-1}
        style={{
          paddingBottom: `calc(${paddingBas}px + env(safe-area-inset-bottom))`,
        }}
        className="mx-auto w-full max-w-[980px] flex-1 px-margin pt-space-sm desktop:px-margin-desktop"
      >
        {children}
      </main>
      {flottant}
      {barreBas}
    </>
  );
}
