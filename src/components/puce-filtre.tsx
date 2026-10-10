import type { ComponentProps, ReactNode } from "react";
import { Icone } from "./icone";
import type { NomIcone } from "./icones";

type Props = {
  selectionnee?: boolean;
  icone?: NomIcone;
  /** Pictogramme en terre cuite, plutôt que sur l'encre de la puce. */
  categorie?: boolean;
  /** Rendu neutre : sélectionnée en bleu clair, les autres contournées en `outline`. Réservé à Annonces, où le pêche est celui de l'action. */
  neutre?: boolean;
  children: ReactNode;
} & Omit<ComponentProps<"a">, "children">;

/**
 * Puce de filtre en pilule, 52 px. Sélectionnée : fond pêche plein et coche. Non sélectionnée :
 * blanc bordé pêche ; en mode `categorie`, le pictogramme reste en terre cuite dans les deux états.
 * En mode `neutre` (Annonces), la sélectionnée est bleu clair, libellé en 800, et les autres ont un
 * contour `outline` de 1,5 px.
 *
 * Navigation par lien (`href`), comme `BarreNavigation` : cohérent avec le reste de l'app.
 */
export function PuceFiltre({
  selectionnee = false,
  icone,
  categorie = false,
  neutre = false,
  children,
  className,
  ...props
}: Props) {
  return (
    <a
      aria-current={selectionnee ? "true" : "false"}
      className={`inline-flex h-[52px] shrink-0 items-center gap-1.5 rounded-full px-4 font-headline text-label-lg whitespace-nowrap ${
        selectionnee
          ? neutre
            ? "bg-surface-container-high font-extrabold text-on-surface"
            : "bg-fond-action text-texte-action"
          : `${neutre ? "border-[1.5px] border-outline" : "border-2 border-contour-action"} bg-fond-carte text-on-surface`
      } ${className ?? ""}`}
      {...props}
    >
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
    </a>
  );
}
