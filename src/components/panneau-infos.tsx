import { Icone } from "./icone";
import type { NomIcone } from "./icones";

type Ligne = { icone: NomIcone; titre: string; detail?: string };

/** Panneau « quand, où » en haut d'une fiche. Bordure sans ombre, comme les cartes de réglage. */
export function PanneauInfos({ lignes }: { lignes: Ligne[] }) {
  return (
    <ul className="flex flex-col gap-space-md rounded-lg border-[1.5px] border-bordure-carte bg-fond-carte p-4">
      {lignes.map((ligne) => (
        <li key={ligne.icone} className="flex items-start gap-space-sm">
          <span className="text-texte-date">
            <Icone nom={ligne.icone} taille={26} />
          </span>
          <div className="min-w-0">
            <p className="font-headline text-body-bold text-on-surface">
              {ligne.titre}
            </p>
            {ligne.detail && (
              <p className="text-body-md text-on-surface-variant">
                {ligne.detail}
              </p>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}
