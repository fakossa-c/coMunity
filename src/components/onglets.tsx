export type Onglet = { id: string; libelle: string; href: string };

type Props = {
  onglets: Onglet[];
  actif: string;
  /** Nom du groupe d'onglets pour le lecteur d'écran (`aria-label` du `tablist`). */
  libelleGroupe: string;
};

/**
 * Onglets internes d'une rubrique (« J'y vais » / « J'organise »). Soulignement terre cuite de
 * 4 px : seul usage de la terre cuite en aplat. La pilule pêche est réservée à l'onglet actif de
 * la barre de navigation du bas.
 *
 * Navigation par lien (`href` par onglet), comme `BarreNavigation` : cohérent avec le reste de
 * l'app, en server components, sans état client.
 */
export function Onglets({ onglets, actif, libelleGroupe }: Props) {
  return (
    <div role="tablist" aria-label={libelleGroupe} className="flex gap-6">
      {onglets.map((onglet) => (
        <a
          key={onglet.id}
          href={onglet.href}
          role="tab"
          aria-selected={onglet.id === actif}
          className={`border-b-4 px-1 py-3 font-headline text-label-lg ${
            onglet.id === actif
              ? "border-texte-date text-on-surface"
              : "border-transparent text-on-surface-variant"
          }`}
        >
          {onglet.libelle}
        </a>
      ))}
    </div>
  );
}
