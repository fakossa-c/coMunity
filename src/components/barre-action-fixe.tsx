import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
  /**
   * Sur ordinateur, l'action devient une carte collante placée dans la page (à poser dans une
   * grille, dans sa colonne de droite) au lieu d'une barre fixée en bas. Le mobile garde la barre.
   */
  carte?: boolean;
};

/**
 * Panneau fixé en bas d'une fiche ou d'un formulaire : l'action principale, à portée du pouce.
 * Sur ordinateur, il est collé au bas du conteneur de 1280 px des écrans, pas de la fenêtre ; avec
 * `carte`, il reste dans la page, à droite du texte, et suit la lecture.
 */
export function BarreActionFixe({ children, carte = false }: Props) {
  if (carte) {
    return (
      <section
        aria-label="Inscription"
        className="fixed inset-x-0 bottom-0 z-40 mx-auto bg-fond-carte pb-[env(safe-area-inset-bottom)] shadow-barre-action desktop:sticky desktop:inset-x-auto desktop:top-6 desktop:bottom-auto desktop:z-auto desktop:mx-0 desktop:self-start desktop:rounded-flottante desktop:pb-0 desktop:shadow-douce"
      >
        <div className="mx-auto flex max-w-conteneur items-center gap-space-sm px-margin py-3 desktop:max-w-none desktop:flex-col desktop:items-stretch desktop:gap-5 desktop:p-8">
          {children}
        </div>
      </section>
    );
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 mx-auto bg-fond-carte pb-[env(safe-area-inset-bottom)] shadow-barre-action desktop:max-w-conteneur desktop:rounded-t-lg">
      <div className="mx-auto flex max-w-conteneur items-center gap-space-sm px-margin py-3 desktop:px-marge-journal">
        {children}
      </div>
    </div>
  );
}
