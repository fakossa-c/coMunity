"use client";

import { useId, useState } from "react";
import { dateReglement, type SectionLue } from "@/lib/reglement";
import { Bouton } from "./bouton";
import { Icone } from "./icone";
import { TexteReglement } from "./texte-reglement";

type Props = {
  /** Dans l'ordre du règlement. */
  sections: SectionLue[];
  /** La date de dernière mise à jour (ISO) ; `null` tant qu'aucune section n'a été écrite. */
  misAJourLe: string | null;
};

/**
 * Le règlement intérieur tel que le lisent les résidents : sections repliées, qui se déplient
 * une à une au toucher de leur titre ou toutes ensemble, sous la date de dernière mise à jour.
 */
export function ReglementInterieur({ sections, misAJourLe }: Props) {
  const [ouvertes, setOuvertes] = useState<ReadonlySet<string>>(new Set());
  const prefixe = useId();

  if (sections.length === 0)
    return (
      <p className="max-w-[65ch] text-body-lg text-on-surface-variant">
        Le conseil syndical n&apos;a pas encore publié le règlement intérieur.
      </p>
    );

  const toutesOuvertes = sections.every((s) => ouvertes.has(s.id));

  function basculer(id: string) {
    const apres = new Set(ouvertes);
    if (!apres.delete(id)) apres.add(id);
    setOuvertes(apres);
  }

  return (
    <div className="flex flex-col gap-space-md">
      <div className="tablet:flex-row tablet:items-center tablet:justify-between flex flex-col gap-space-sm">
        {misAJourLe && (
          <p className="text-body-md text-on-surface-variant">
            {`Mis à jour le ${dateReglement(misAJourLe)}`}
          </p>
        )}
        <Bouton
          variante="contour"
          icone={toutesOuvertes ? "expand_less" : "expand_more"}
          onClick={() =>
            setOuvertes(
              toutesOuvertes ? new Set() : new Set(sections.map((s) => s.id)),
            )
          }
        >
          {toutesOuvertes ? "Tout replier" : "Tout déplier"}
        </Bouton>
      </div>
      <ul className="flex flex-col gap-space-sm">
        {sections.map((section) => {
          const ouverte = ouvertes.has(section.id);
          const id = `${prefixe}-${section.id}`;
          return (
            <li
              key={section.id}
              className="rounded-lg border-[1.5px] border-bordure-carte bg-fond-carte"
            >
              <h3>
                <button
                  type="button"
                  id={`${id}-bouton`}
                  aria-expanded={ouverte}
                  aria-controls={`${id}-texte`}
                  onClick={() => basculer(section.id)}
                  className="flex min-h-cible w-full items-center justify-between gap-space-sm rounded-lg px-4 py-3 text-left font-headline text-headline-sm text-on-surface hover:bg-surface-container-low"
                >
                  <span className="[overflow-wrap:anywhere]">
                    {section.titre}
                  </span>
                  <Icone nom={ouverte ? "expand_less" : "expand_more"} />
                </button>
              </h3>
              <div
                id={`${id}-texte`}
                role="region"
                aria-labelledby={`${id}-bouton`}
                hidden={!ouverte}
                className="px-4 pb-4"
              >
                <TexteReglement texte={section.texte} />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
