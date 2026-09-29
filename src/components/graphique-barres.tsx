export type BarreGraphique = {
  cle: string;
  libelle: string;
  /** Longueur de la barre, de 0 à `maximum` ; `null` : pas de barre. */
  valeur: number | null;
  /** La valeur en toutes lettres, lue par le lecteur d'écran : « 60 % », « 4 participants ». */
  texteValeur: string;
  /** Complément sous le libellé : « 2 activités ». */
  detail?: string;
};

type Props = {
  titre: string;
  /** Le texte équivalent du graphique, en une phrase : ce qu'il faut en retenir. */
  resume: string;
  barres: BarreGraphique[];
  /** La valeur qui remplit toute la largeur : 100 pour un pourcentage. */
  maximum: number;
};

/**
 * Graphique en barres horizontales : un titre, une phrase qui en donne l'essentiel, puis une
 * liste où chaque ligne dit son libellé et sa valeur en texte. Les barres n'ajoutent que le
 * coup d'œil (`aria-hidden`) : tout ce qu'elles montrent se lit dans la liste.
 */
export function GraphiqueBarres({ titre, resume, barres, maximum }: Props) {
  return (
    <figure className="flex flex-col gap-space-sm rounded-lg border-[1.5px] border-bordure-carte bg-fond-carte p-space-md">
      <figcaption>
        <h3 className="font-headline text-headline-sm font-extrabold text-on-surface">
          {titre}
        </h3>
        <p className="mt-1 text-body-md text-on-surface-variant">{resume}</p>
      </figcaption>
      <ul className="flex flex-col gap-space-sm">
        {barres.map((barre) => (
          <li key={barre.cle} className="flex flex-col gap-1">
            <div className="flex flex-wrap items-baseline justify-between gap-x-space-sm">
              <span className="font-headline text-label-lg text-on-surface">
                {barre.libelle}
              </span>
              <span className="text-body-md text-on-surface">
                <span className="font-bold">{barre.texteValeur}</span>
                {barre.detail && (
                  <span className="text-on-surface-variant">
                    {" "}
                    · {barre.detail}
                  </span>
                )}
              </span>
            </div>
            <div
              aria-hidden="true"
              className="h-2.5 w-full overflow-hidden rounded-full bg-surface-container-low"
            >
              {barre.valeur !== null && barre.valeur > 0 && (
                <div
                  className="h-full rounded-full bg-secondary-fixed-dim"
                  style={{
                    width: `${Math.min(100, (barre.valeur / maximum) * 100)}%`,
                  }}
                />
              )}
            </div>
          </li>
        ))}
      </ul>
    </figure>
  );
}
