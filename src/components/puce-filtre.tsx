import type { ComponentProps, ReactNode } from "react";
import { Icone } from "./icone";
import type { NomIcone } from "./icones";

type PropsCommunes = {
  selectionnee?: boolean;
  icone?: NomIcone;
  /** Pictogramme en terre cuite, plutôt que sur l'encre de la puce. */
  categorie?: boolean;
  children: ReactNode;
};

export type PropsPuceFiltre = PropsCommunes &
  (
    | ({ href: string } & Omit<ComponentProps<"a">, "href" | "children">)
    | ({ href?: undefined } & Omit<ComponentProps<"button">, "children">)
  );

/**
 * Puce de filtre en pilule, 52 px. Sélectionnée : fond pêche plein et coche. Non sélectionnée :
 * blanc bordé pêche ; en mode `categorie`, le pictogramme reste en terre cuite dans les deux états.
 */
export function PuceFiltre({
  selectionnee = false,
  icone,
  categorie = false,
  href,
  children,
  className,
  ...props
}: PropsPuceFiltre) {
  const classes = `inline-flex h-[52px] items-center gap-1.5 rounded-full px-4 font-headline text-label-lg ${
    selectionnee
      ? "bg-fond-action text-texte-action"
      : "border-2 border-contour-action bg-fond-carte text-on-surface"
  } ${className ?? ""}`;

  const contenu = (
    <>
      {icone && (
        <Icone
          nom={icone}
          taille={22}
          plein={selectionnee && !categorie}
          className={categorie ? "text-texte-date" : undefined}
        />
      )}
      {children}
      {selectionnee && <Icone nom="check_circle" taille={22} plein />}
    </>
  );

  if (href) {
    return (
      <a
        href={href}
        aria-current={selectionnee ? "true" : "false"}
        className={classes}
        {...(props as Omit<ComponentProps<"a">, "href" | "children">)}
      >
        {contenu}
      </a>
    );
  }

  return (
    <button
      type="button"
      aria-pressed={selectionnee}
      className={classes}
      {...(props as Omit<ComponentProps<"button">, "children">)}
    >
      {contenu}
    </button>
  );
}
