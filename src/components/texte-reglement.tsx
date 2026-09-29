import { Fragment } from "react";
import { decouperTexte, type Morceau } from "@/lib/reglement";

function Morceaux({ morceaux }: { morceaux: Morceau[] }) {
  return morceaux.map((morceau, i) =>
    morceau.gras ? (
      <strong key={i}>{morceau.texte}</strong>
    ) : (
      <Fragment key={i}>{morceau.texte}</Fragment>
    ),
  );
}

/**
 * Le texte d'une section du règlement intérieur : paragraphes, listes à puces et gras. Rendu par
 * des éléments React, jamais par du HTML : un texte n'injecte rien. Sert à la lecture comme à
 * l'aperçu du conseil syndical.
 */
export function TexteReglement({ texte }: { texte: string }) {
  return (
    <div className="flex max-w-[65ch] flex-col gap-space-sm text-body-lg text-on-surface">
      {decouperTexte(texte).map((bloc, i) =>
        bloc.type === "liste" ? (
          <ul key={i} className="flex list-disc flex-col gap-space-xs pl-6">
            {bloc.elements.map((element, j) => (
              <li key={j}>
                <Morceaux morceaux={element} />
              </li>
            ))}
          </ul>
        ) : (
          <p key={i} className="whitespace-pre-line">
            <Morceaux morceaux={bloc.morceaux} />
          </p>
        ),
      )}
    </div>
  );
}
