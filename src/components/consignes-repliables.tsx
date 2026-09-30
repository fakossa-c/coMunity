"use client";

import { useId, useState } from "react";
import { Bouton } from "./bouton";

type Props = {
  /** Les consignes toujours visibles. */
  visibles: string[];
  /** Les suivantes : dans la page, mais repliées jusqu'au clic. */
  suite: string[];
};

/**
 * Consignes d'un espace commun : les premières se lisent tout de suite, les autres se déplient
 * doucement sous elles (`depliage`, toujours dans le DOM, inertes tant qu'elles sont repliées).
 * Sans suite, pas de bouton.
 */
export function ConsignesRepliables({ visibles, suite }: Props) {
  const [ouvert, setOuvert] = useState(false);
  const id = useId();

  return (
    <div>
      <ul className="flex list-disc flex-col gap-space-xs pl-6 marker:text-primary">
        {visibles.map((ligne, i) => (
          <li key={i} className="[overflow-wrap:anywhere]">
            {ligne}
          </li>
        ))}
      </ul>
      {suite.length > 0 && (
        <>
          <div
            id={`${id}-suite`}
            className="depliage"
            data-ouvert={ouvert ? "" : undefined}
            inert={!ouvert}
          >
            <div>
              <ul className="mt-space-xs flex list-disc flex-col gap-space-xs pl-6 marker:text-primary">
                {suite.map((ligne, i) => (
                  <li key={i} className="[overflow-wrap:anywhere]">
                    {ligne}
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <Bouton
            variante="contour"
            icone={ouvert ? "expand_less" : "expand_more"}
            aria-expanded={ouvert}
            aria-controls={`${id}-suite`}
            onClick={() => setOuvert(!ouvert)}
            className="mt-space-md"
          >
            {ouvert ? "Réduire les consignes" : "Lire toutes les consignes"}
          </Bouton>
        </>
      )}
    </div>
  );
}
