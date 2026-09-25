import type { ReactNode } from "react";
import { Icone } from "./icone";
import type { NomIcone } from "./icones";

type Ligne = {
  cle?: string;
  icone: NomIcone;
  /** Libellé discret : « Email » */
  titre: string;
  /** Valeur en gras : « danielle.m@exemple.fr » */
  detail?: string;
  /** Action à droite : bouton fantôme « Modifier »… */
  fin?: ReactNode;
};

type Props = { lignes: Ligne[]; libelle?: string };

/** Carte bordée sans ombre (on la lit, on ne la touche pas en entier), découpée en lignes de 64 px. */
export function CarteLignes({ lignes, libelle }: Props) {
  return (
    <ul
      aria-label={libelle}
      className="flex flex-col divide-y-[1.5px] divide-bordure-carte rounded-lg border-[1.5px] border-bordure-carte bg-fond-carte"
    >
      {lignes.map(({ cle, icone, titre, detail, fin }) => (
        <li
          key={cle ?? titre}
          className="flex min-h-ligne items-center gap-space-sm px-4 py-2"
        >
          <span className="text-on-surface-variant">
            <Icone nom={icone} taille={24} />
          </span>
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="text-body-md text-on-surface-variant">
              {titre}
            </span>
            {detail && (
              <span className="font-headline text-label-lg [overflow-wrap:anywhere] text-on-surface">
                {detail}
              </span>
            )}
          </div>
          {fin}
        </li>
      ))}
    </ul>
  );
}
