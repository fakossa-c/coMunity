import Link from "next/link";
import { Icone } from "./icone";
import type { NomIcone } from "./icones";

/** Onglets de la barre du bas. Un onglet de plus s'ajoute ici, sans rien d'autre à changer. */
export const ONGLETS = [
  { id: "accueil", href: "/", libelle: "Accueil", icone: "home" },
  {
    id: "activites",
    href: "/activites",
    libelle: "Activités",
    icone: "diversity_3",
  },
  { id: "annonces", href: "/annonces", libelle: "Annonces", icone: "campaign" },
] as const satisfies readonly {
  id: string;
  href: string;
  libelle: string;
  icone: NomIcone;
}[];

export type IdOnglet = (typeof ONGLETS)[number]["id"];

/**
 * Barre du bas des écrans principaux, fixe. Onglet actif : pictogramme plein sur une pilule
 * pêche, libellé en 800. Pas d'ombre : un filet la sépare du contenu.
 */
export function BarreNavigation({ actif }: { actif: IdOnglet }) {
  return (
    <nav
      aria-label="Navigation principale"
      className="fixed inset-x-0 bottom-0 z-40 border-t-[1.5px] border-bordure-carte bg-fond-carte pb-[env(safe-area-inset-bottom)]"
    >
      <ul className="mx-auto flex h-barre-nav max-w-lg">
        {ONGLETS.map(({ id, href, libelle, icone }) => {
          const estActif = id === actif;
          return (
            <li key={id} className="flex flex-1">
              <Link
                href={href}
                aria-current={estActif ? "page" : undefined}
                className="flex min-w-cible flex-1 flex-col items-center justify-center gap-1 rounded-lg font-headline text-etiquette hover:bg-surface-container-low"
              >
                <span
                  className={`flex h-8 w-onglet items-center justify-center rounded-full ${estActif ? "bg-fond-action text-texte-action" : "text-on-surface-variant"}`}
                >
                  <Icone nom={icone} plein={estActif} taille={26} />
                </span>
                <span
                  className={`whitespace-nowrap ${estActif ? "font-extrabold text-on-surface" : "font-bold text-on-surface-variant"}`}
                >
                  {libelle}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
