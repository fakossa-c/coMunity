import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
  /**
   * Sur ordinateur, l'action devient une carte collante placée dans la page (à poser dans une
   * grille, dans sa colonne de droite) au lieu d'une barre fixée en bas. Le mobile garde la barre.
   */
  carte?: boolean;
  /**
   * Sur ordinateur, la barre reste fixée en bas de l'écran mais suit la colonne de 720 px d'un
   * formulaire de l'espace syndic (`EcranSyndic`) : sa largeur et son bord gauche. Le mobile garde
   * la barre pleine largeur.
   */
  colonne?: boolean;
};

/**
 * Panneau fixé en bas d'une fiche ou d'un formulaire : l'action principale, à portée du pouce.
 * Sur ordinateur, il est collé au bas du conteneur de 1280 px des écrans, pas de la fenêtre, et
 * laisse libre le menu de l'espace syndic ; avec `colonne`, il suit la colonne d'un formulaire de
 * l'espace syndic ; avec `carte`, il reste dans la page, à droite du texte, et suit la lecture.
 */
export function BarreActionFixe({
  children,
  carte = false,
  colonne = false,
}: Props) {
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

  if (colonne) {
    // Sur ordinateur, la bande fixe, transparente et sans prise au clic, reprend l'espace et les
    // marges du contenu à droite du menu : seule sa carte, de la largeur de la colonne, se voit.
    // Elle passe sous le menu de l'espace syndic, déplié par-dessus le contenu de 64 à 80 rem.
    return (
      <div className="fixed inset-x-0 bottom-0 z-40 bg-fond-carte pb-[env(safe-area-inset-bottom)] shadow-barre-action desktop:pointer-events-none desktop:left-[var(--largeur-menu-syndic,0px)] desktop:z-20 desktop:bg-transparent desktop:pb-0 desktop:shadow-none">
        <div className="mx-auto max-w-conteneur desktop:max-w-contenu-syndic desktop:px-margin-desktop">
          <div className="flex items-center gap-space-sm px-margin py-3 desktop:pointer-events-auto desktop:max-w-[45rem] desktop:rounded-t-lg desktop:bg-fond-carte desktop:px-8 desktop:pb-[calc(0.75rem+env(safe-area-inset-bottom))] desktop:shadow-barre-action">
            {children}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 mx-auto bg-fond-carte pb-[env(safe-area-inset-bottom)] shadow-barre-action desktop:left-[var(--largeur-menu-syndic,0px)] desktop:max-w-conteneur desktop:rounded-t-lg">
      <div className="mx-auto flex max-w-conteneur items-center gap-space-sm px-margin py-3 desktop:px-marge-journal">
        {children}
      </div>
    </div>
  );
}
