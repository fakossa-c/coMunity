import type { ReactNode } from "react";

/** Panneau fixé en bas d'une fiche ou d'un formulaire : l'action principale, à portée du pouce. */
export function BarreActionFixe({ children }: { children: ReactNode }) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 bg-fond-carte pb-[env(safe-area-inset-bottom)] shadow-barre-action">
      <div className="mx-auto flex max-w-[980px] items-center gap-space-sm px-margin py-3 desktop:px-margin-desktop">
        {children}
      </div>
    </div>
  );
}
