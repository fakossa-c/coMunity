import Link from "next/link";
import { Icone } from "./icone";
import type { NomIcone } from "./icones";

/**
 * Onglets de l'application. Un onglet de plus s'ajoute ici, sans rien d'autre à changer.
 * `libelleCourt` : libellé de la barre du bas, faute de place. `syndic` : onglet réservé à un
 * membre actif du conseil syndical.
 */
export const ONGLETS = [
  { id: "accueil", href: "/", libelle: "Accueil", icone: "home" },
  {
    id: "activites",
    href: "/activites",
    libelle: "Activités",
    icone: "diversity_3",
  },
  { id: "annonces", href: "/annonces", libelle: "Annonces", icone: "campaign" },
  {
    id: "syndic",
    href: "/syndic/tableau-de-bord",
    libelle: "Tableau de bord",
    libelleCourt: "Syndic",
    icone: "monitoring",
    syndic: true,
  },
] as const satisfies readonly {
  id: string;
  href: string;
  libelle: string;
  libelleCourt?: string;
  icone: NomIcone;
  syndic?: boolean;
}[];

export type IdOnglet = (typeof ONGLETS)[number]["id"];

const MISES_EN_PAGE = {
  /** Barre du bas, fixe : pictogramme au-dessus du libellé. Un filet la sépare du contenu. */
  bas: {
    nav: "fixed inset-x-0 bottom-0 z-40 border-t-[1.5px] border-bordure-carte bg-fond-carte pb-[env(safe-area-inset-bottom)] desktop:hidden",
    liste: "mx-auto flex h-barre-nav max-w-lg",
    item: "flex flex-1",
    lien: "flex min-w-cible flex-1 flex-col items-center justify-center gap-1 rounded-lg font-headline text-etiquette hover:bg-surface-container-low",
  },
  /** Barre du haut du cadre Journal : pilules de libellé seul, l'onglet actif en pêche. */
  haut: {
    nav: undefined,
    liste: "flex gap-1.5",
    item: undefined,
    lien: "flex min-h-12 items-center rounded-full px-6 font-headline text-label-lg transition-colors duration-(--duree-courte) ease-journal",
  },
};

const LIEN_ACTIF_HAUT = "bg-fond-action font-extrabold text-texte-action";
const LIEN_INACTIF_HAUT =
  "font-bold text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface";

/**
 * Onglets de l'application. `bas` : barre fixe du mobile, après le contenu ; pictogramme
 * au-dessus du libellé, un filet la sépare du contenu ; onglet actif : pictogramme plein sur une
 * pilule pêche, libellé en 800. `haut` : onglets de la barre du haut du cadre Journal, sur
 * ordinateur ; pilules de libellé seul, l'onglet actif en pêche et en 800. Les deux sont posées
 * dans la page, une seule s'affiche selon la largeur : l'autre est absente de l'arbre
 * d'accessibilité et de l'ordre de tabulation. `actif` est absent d'un écran secondaire. Un
 * membre actif du conseil syndical a un quatrième onglet, « Tableau de bord » en haut et
 * « Syndic » en bas, actif sur tout l'espace syndic.
 */
export function BarreNavigation({
  actif,
  emplacement,
  syndic = false,
}: {
  actif?: IdOnglet;
  emplacement: keyof typeof MISES_EN_PAGE;
  /** Vrai pour un membre actif du conseil syndical : l'onglet de l'espace syndic s'ajoute. */
  syndic?: boolean;
}) {
  const mise = MISES_EN_PAGE[emplacement];
  const bas = emplacement === "bas";
  const onglets = ONGLETS.filter((onglet) => syndic || !("syndic" in onglet));
  return (
    <nav aria-label="Navigation principale" className={mise.nav}>
      <ul className={mise.liste}>
        {onglets.map((onglet) => {
          const { id, href, libelle, icone } = onglet;
          const estActif = id === actif;
          return (
            <li key={id} className={mise.item}>
              <Link
                href={href}
                aria-current={estActif ? "page" : undefined}
                className={`${mise.lien} ${bas ? "" : estActif ? LIEN_ACTIF_HAUT : LIEN_INACTIF_HAUT}`}
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
                      {"libelleCourt" in onglet ? onglet.libelleCourt : libelle}
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
