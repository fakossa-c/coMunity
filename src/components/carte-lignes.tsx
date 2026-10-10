import type { ReactNode } from "react";
import { Icone } from "./icone";
import type { NomIcone } from "./icones";

/** Tête de ligne : un pictogramme, ou, pour une liste de personnes, un avatar. Jamais les deux, jamais aucun. */
type TeteLigne =
  { icone: NomIcone; avatar?: never } | { avatar: ReactNode; icone?: never };

export type LigneCarte = TeteLigne & {
  cle?: string;
  /** Libellé discret : « Email » */
  titre: string;
  /** Valeur en gras : « danielle.m@exemple.fr » */
  detail?: string;
  /** Action à droite : bouton fantôme « Modifier »… */
  fin?: ReactNode;
};

type Props = { lignes: LigneCarte[]; libelle?: string };

/**
 * Carte bordée sans ombre (on la lit, on ne la touche pas en entier), découpée en lignes de 64 px.
 * Sur ordinateur (Journal), la bordure s'efface : un filet de 1 px en `--filet` sépare les lignes.
 * Quand l'action ne tient pas à côté de 9 rem de texte, elle passe à la ligne, à droite : une
 * adresse longue ne s'empile plus lettre par lettre (issues #177, #180, #181).
 */
export function CarteLignes({ lignes, libelle }: Props) {
  return (
    <ul
      aria-label={libelle}
      className="flex flex-col divide-y-[1.5px] divide-bordure-carte rounded-lg border-[1.5px] border-bordure-carte bg-fond-carte desktop:divide-y desktop:divide-filet"
    >
      {lignes.map(({ cle, icone, avatar, titre, detail, fin }) => (
        <li
          key={cle ?? titre}
          className="flex min-h-ligne flex-wrap items-center gap-space-sm px-4 py-2"
        >
          {avatar ??
            (icone && (
              <span className="text-on-surface-variant">
                <Icone nom={icone} taille={24} />
              </span>
            ))}
          <div className="flex min-w-0 flex-1 basis-36 flex-col">
            <span className="text-body-md text-on-surface-variant">
              {titre}
            </span>
            {detail && (
              <span className="font-headline text-label-lg [overflow-wrap:anywhere] text-on-surface">
                {detail}
              </span>
            )}
          </div>
          {fin && <div className="ml-auto flex max-w-full">{fin}</div>}
        </li>
      ))}
    </ul>
  );
}
