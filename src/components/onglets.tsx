import { Icone } from "./icone";
import type { NomIcone } from "./icones";

export type Onglet = {
  id: string;
  libelle: string;
  href: string;
  icone: NomIcone;
  /** Nombre d'éléments du segment, dans une pastille blanche. */
  compteur: number;
};

type Props = {
  onglets: Onglet[];
  actif: string;
  /** Nom du groupe d'onglets pour le lecteur d'écran (`aria-label` du `tablist`). */
  libelleGroupe: string;
};

/**
 * Onglets internes d'une rubrique (« Je participe » / « J'organise » / « Archivées »), en contrôle
 * segmenté : une pilule bleue clair qui porte les segments, dont l'actif est plein pêche, avec
 * son compteur. Sur mobile les trois segments se partagent la largeur, libellé au-dessus du
 * compteur ; sur ordinateur, segments de 212 px avec pictogramme, libellé et compteur côte à côte.
 *
 * Navigation par lien (`href` par onglet), comme `BarreNavigation` : cohérent avec le reste de
 * l'app, en server components, sans état client.
 */
export function Onglets({ onglets, actif, libelleGroupe }: Props) {
  return (
    <div
      role="tablist"
      aria-label={libelleGroupe}
      className="flex gap-1.5 rounded-full bg-surface-container p-1.5 desktop:inline-flex"
    >
      {onglets.map((onglet) => {
        const selectionne = onglet.id === actif;
        return (
          <a
            key={onglet.id}
            href={onglet.href}
            role="tab"
            aria-selected={selectionne}
            className={`flex min-h-ligne min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-full px-1 text-center font-headline text-label-md transition-colors duration-(--duree-courte) ease-journal desktop:h-[54px] desktop:min-h-0 desktop:w-[212px] desktop:flex-none desktop:flex-row desktop:gap-2.5 desktop:px-6 desktop:text-label-lg ${
              selectionne
                ? "bg-fond-action font-extrabold text-texte-action"
                : "text-on-surface-variant hover:bg-fond-carte/60 hover:text-on-surface"
            }`}
          >
            <Icone
              nom={onglet.icone}
              plein={selectionne}
              taille={24}
              className="hidden desktop:block"
            />
            {onglet.libelle}
            <span
              className={`inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-fond-carte px-2 font-headline text-label-md desktop:h-7 desktop:min-w-7 ${
                selectionne ? "text-texte-action" : "text-on-surface-variant"
              }`}
            >
              {onglet.compteur}
              <span className="sr-only">
                {" "}
                activité{onglet.compteur > 1 ? "s" : ""}
              </span>
            </span>
          </a>
        );
      })}
    </div>
  );
}
