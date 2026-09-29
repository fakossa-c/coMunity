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

const MISES_EN_PAGE = {
  /** Barre du bas, fixe : pictogramme au-dessus du libellé. Un filet la sépare du contenu. */
  bas: {
    nav: "fixed inset-x-0 bottom-0 z-40 border-t-[1.5px] border-bordure-carte bg-fond-carte pb-[env(safe-area-inset-bottom)] desktop:hidden",
    liste: "mx-auto flex h-barre-nav max-w-lg",
    item: "flex flex-1",
    lien: "flex min-w-cible flex-1 flex-col items-center justify-center gap-1 rounded-lg font-headline text-etiquette hover:bg-surface-container-low",
    pilule: "w-onglet",
  },
  /** Onglets de l'en-tête de résidence : pictogramme et libellé côte à côte, sans filet ni fond. */
  entete: {
    nav: "ml-space-md hidden desktop:block",
    liste: "flex gap-1",
    item: "flex",
    lien: "flex min-h-cible items-center gap-2 rounded-lg px-2 font-headline text-label-lg hover:bg-surface-container-low",
    pilule: "w-12",
  },
};

/**
 * Onglets des écrans principaux. Onglet actif : pictogramme plein sur une pilule pêche, libellé
 * en 800. `bas` : barre fixe du mobile, après le contenu ; `entete` : sur ordinateur, dans
 * l'en-tête de résidence. Les deux sont posées, une seule s'affiche selon la largeur : l'autre
 * est absente de l'arbre d'accessibilité et de l'ordre de tabulation.
 */
export function BarreNavigation({
  actif,
  emplacement,
}: {
  actif: IdOnglet;
  emplacement: keyof typeof MISES_EN_PAGE;
}) {
  const mise = MISES_EN_PAGE[emplacement];
  return (
    <nav aria-label="Navigation principale" className={mise.nav}>
      <ul className={mise.liste}>
        {ONGLETS.map(({ id, href, libelle, icone }) => {
          const estActif = id === actif;
          return (
            <li key={id} className={mise.item}>
              <Link
                href={href}
                aria-current={estActif ? "page" : undefined}
                className={mise.lien}
              >
                <span
                  className={`flex h-8 ${mise.pilule} items-center justify-center rounded-full ${estActif ? "bg-fond-action text-texte-action" : "text-on-surface-variant"}`}
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
