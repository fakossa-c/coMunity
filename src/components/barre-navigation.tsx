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
 *
 * Sur ordinateur, les mêmes onglets, dans l'en-tête de résidence qui la contient : pictogramme
 * et libellé côte à côte, sans filet ni fond. Une seule navigation dans la page, deux mises en page.
 */
export function BarreNavigation({ actif }: { actif: IdOnglet }) {
  return (
    <nav
      aria-label="Navigation principale"
      className="fixed inset-x-0 bottom-0 z-40 border-t-[1.5px] border-bordure-carte bg-fond-carte pb-[env(safe-area-inset-bottom)] desktop:static desktop:z-auto desktop:ml-space-md desktop:border-0 desktop:bg-transparent desktop:pb-0"
    >
      <ul className="mx-auto flex h-barre-nav max-w-lg desktop:mx-0 desktop:h-auto desktop:max-w-none desktop:gap-1">
        {ONGLETS.map(({ id, href, libelle, icone }) => {
          const estActif = id === actif;
          return (
            <li key={id} className="flex flex-1 desktop:flex-none">
              <Link
                href={href}
                aria-current={estActif ? "page" : undefined}
                className="flex min-w-cible flex-1 flex-col items-center justify-center gap-1 rounded-lg font-headline text-etiquette hover:bg-surface-container-low desktop:min-h-cible desktop:flex-row desktop:gap-2 desktop:px-2 desktop:text-label-lg"
              >
                <span
                  className={`flex h-8 w-onglet items-center justify-center rounded-full desktop:w-12 ${estActif ? "bg-fond-action text-texte-action" : "text-on-surface-variant"}`}
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
