import type { ReactNode } from "react";
import { Icone } from "@/components/icone";
import type { BlocPage } from "@/lib/proposition-activite";

type Props = {
  bloc: BlocPage;
  numero: number;
  titre: string;
  /** La phrase d'aide sous le titre du bloc, sur ordinateur. */
  aide?: string;
  /** Le bloc est rempli : sa pastille numérotée passe au vert, coche comprise. */
  fait: boolean;
  /**
   * Vrai quand l'étape du mobile n'est pas celle de ce bloc : il reste dans la page, masqué. Sur
   * ordinateur, tous les blocs se voient (`pageUnique`).
   */
  masqueSurMobile: boolean;
  /** Vrai pour Proposer : sur ordinateur, les champs se rangent en six blocs sur une page. Faux pour Modifier, qui garde ses étapes. */
  pageUnique: boolean;
  children: ReactNode;
};

/**
 * Un des six blocs de la page unique : sur ordinateur, une carte sans contour avec une pastille
 * numérotée, son titre et son aide ; sur mobile, seulement les champs de l'étape courante.
 */
export function BlocSaisie({
  bloc,
  numero,
  titre,
  aide,
  fait,
  masqueSurMobile,
  pageUnique,
  children,
}: Props) {
  return (
    <section
      id={`bloc-${bloc}`}
      className={`${masqueSurMobile ? "hidden" : "flex"} flex-col gap-bloc ${
        pageUnique
          ? "desktop:flex desktop:scroll-mt-4 desktop:rounded-flottante desktop:bg-fond-carte desktop:px-9 desktop:py-7 desktop:shadow-douce"
          : ""
      }`}
    >
      {pageUnique && (
        <header className="hidden items-center gap-4 desktop:flex">
          <span
            aria-hidden="true"
            data-fait={fait}
            className={`relative flex size-11 shrink-0 items-center justify-center rounded-full font-headline text-label-lg font-extrabold transition-colors duration-(--duree-longue) ease-journal ${
              fait
                ? "bg-fond-confirme text-texte-confirme"
                : "bg-fond-action text-texte-action"
            }`}
          >
            {fait ? <Icone nom="check" taille={24} /> : numero}
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="font-headline text-headline-lg text-on-surface">
              {titre}
            </h2>
            {aide && (
              <p className="text-body-md text-on-surface-variant">{aide}</p>
            )}
          </div>
        </header>
      )}
      {children}
    </section>
  );
}
