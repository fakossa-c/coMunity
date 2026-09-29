import Link from "next/link";
import { Icone } from "./icone";
import type { NomIcone } from "./icones";

/** Onglets de l'application. Un onglet de plus s'ajoute ici, sans rien d'autre à changer. */
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
 * Onglets de l'application. `bas` : barre fixe du mobile, après le contenu ; pictogramme
 * au-dessus du libellé, un filet la sépare du contenu ; onglet actif : pictogramme plein sur une
 * pilule pêche, libellé en 800. `haut` : onglets de la barre du haut du cadre Journal, sur
 * ordinateur ; pilules de libellé seul, l'onglet actif en pêche et en 800. Les deux sont posées
 * dans la page, une seule s'affiche selon la largeur : l'autre est absente de l'arbre
 * d'accessibilité et de l'ordre de tabulation. `actif` est absent d'un écran secondaire.
 */
export function BarreNavigation({
  actif,
  emplacement,
}: {
  actif?: IdOnglet;
  emplacement: "bas" | "haut";
}) {
  const bas = emplacement === "bas";
  return (
    <nav
      aria-label="Navigation principale"
      className={
        bas
          ? "fixed inset-x-0 bottom-0 z-40 border-t-[1.5px] border-bordure-carte bg-fond-carte pb-[env(safe-area-inset-bottom)] desktop:hidden"
          : undefined
      }
    >
      <ul
        className={bas ? "mx-auto flex h-barre-nav max-w-lg" : "flex gap-1.5"}
      >
        {ONGLETS.map(({ id, href, libelle, icone }) => {
          const estActif = id === actif;
          return (
            <li key={id} className={bas ? "flex flex-1" : undefined}>
              <Link
                href={href}
                aria-current={estActif ? "page" : undefined}
                className={
                  bas
                    ? "flex min-w-cible flex-1 flex-col items-center justify-center gap-1 rounded-lg font-headline text-etiquette hover:bg-surface-container-low"
                    : `flex min-h-12 items-center rounded-full px-6 font-headline text-label-lg transition-colors duration-(--duree-courte) ease-journal ${estActif ? "bg-fond-action font-extrabold text-texte-action" : "font-bold text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface"}`
                }
              >
                {bas ? (
                  <>
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
                  </>
                ) : (
                  libelle
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
