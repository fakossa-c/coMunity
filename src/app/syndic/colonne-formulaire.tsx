import type { ReactNode } from "react";

/**
 * Colonne d'un formulaire de l'espace syndic sur ordinateur : 720 px au plus, sous « Retour »,
 * le titre de page compris. Sur mobile, elle ne change rien.
 */
export function ColonneFormulaire({ children }: { children: ReactNode }) {
  return <div className="desktop:max-w-[45rem]">{children}</div>;
}

/**
 * Un bloc de champs d'un formulaire de l'espace syndic : sur ordinateur, une carte sans contour
 * (ombre douce, rayon 28, marge de 36 px sur 28, comme les blocs de Proposer) ; sur mobile, les
 * champs restent empilés comme avant.
 */
export function BlocFormulaire({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col gap-bloc desktop:rounded-flottante desktop:bg-fond-carte desktop:px-9 desktop:py-7 desktop:shadow-douce">
      {children}
    </div>
  );
}

/** Espacement des blocs d'un formulaire de l'espace syndic : celui du mobile, 32 px sur ordinateur. */
export const CLASSES_FORMULAIRE = "flex flex-col gap-bloc desktop:gap-8";
