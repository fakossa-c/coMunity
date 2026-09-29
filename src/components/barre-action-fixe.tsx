import type { ReactNode } from "react";

/**
 * Panneau fixé en bas d'une fiche ou d'un formulaire : l'action principale, à portée du pouce.
 * Sur ordinateur, il est collé au bas du conteneur de 1280 px des écrans, pas de la fenêtre.
 */
export function BarreActionFixe({ children }: { children: ReactNode }) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 mx-auto bg-fond-carte pb-[env(safe-area-inset-bottom)] shadow-barre-action desktop:max-w-conteneur desktop:rounded-t-lg">
      <div className="mx-auto flex max-w-conteneur items-center gap-space-sm px-margin py-3 desktop:px-marge-journal">
        {children}
      </div>
    </div>
  );
}
