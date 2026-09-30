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
  /** Ancre de la section des espaces communs de la page, que le sommaire propose d'abord. */
  ancreEspaces: string;
};

/** Une ligne du sommaire : pilule de 48 px, animée au survol. */
const LIEN_SOMMAIRE =
  "flex min-h-12 items-center gap-space-xs rounded-full px-3.5 py-2 font-headline text-body-bold transition-colors duration-(--duree-courte) ease-journal";

/**
 * Le règlement intérieur tel que le lisent les résidents : sections repliées, qui se déplient
 * une à une au toucher de leur titre ou toutes ensemble, sous la date de dernière mise à jour.
 * Sur ordinateur, un sommaire reste visible à côté : le lien vers les espaces communs, qui
 * précèdent le règlement dans la page, puis un lien par section, qui l'ouvre.
 */
export function ReglementInterieur({
  sections,
  misAJourLe,
  ancreEspaces,
}: Props) {
  const [ouvertes, setOuvertes] = useState<ReadonlySet<string>>(new Set());
  const [derniereOuverte, setDerniereOuverte] = useState<string | null>(null);
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
    if (!apres.delete(id)) {
      apres.add(id);
      setDerniereOuverte(id);
    }
    setOuvertes(apres);
  }

  /** Le lien du sommaire ouvre la section ; l'ancre y conduit. */
  function ouvrir(id: string) {
    setOuvertes(new Set(ouvertes).add(id));
    setDerniereOuverte(id);
  }

  return (
    <div className="flex flex-col gap-space-md">
      <div className="flex flex-col gap-space-sm desktop:flex-row desktop:items-center desktop:justify-between">
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
      <div className="desktop:grid desktop:grid-cols-[minmax(0,47.5rem)_minmax(0,1fr)] desktop:items-start desktop:gap-10">
        <ul className="flex flex-col gap-space-sm">
          {sections.map((section) => {
            const ouverte = ouvertes.has(section.id);
            const id = `${prefixe}-${section.id}`;
            return (
              <li
                id={`${id}-section`}
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
        <nav
          aria-label="Sommaire du règlement"
          className="hidden desktop:sticky desktop:top-6 desktop:block desktop:rounded-flottante desktop:bg-surface-container-low desktop:p-5"
        >
          <a
            href={ancreEspaces}
            className={`${LIEN_SOMMAIRE} text-on-surface hover:bg-surface-container`}
          >
            <Icone nom="arrow_back" taille={22} className="rotate-90" />
            Espaces communs
          </a>
          <ul className="mt-space-xs flex flex-col gap-space-xs">
            {sections.map((section) => {
              const courante = derniereOuverte === section.id;
              return (
                <li key={section.id}>
                  <a
                    href={`#${prefixe}-${section.id}-section`}
                    aria-current={courante ? "true" : undefined}
                    onClick={() => ouvrir(section.id)}
                    className={`${LIEN_SOMMAIRE} ${courante ? "bg-fond-action font-extrabold text-texte-action" : "text-on-surface-variant hover:bg-surface-container hover:text-on-surface"}`}
                  >
                    <span
                      aria-hidden="true"
                      className={`size-2 shrink-0 rounded-full bg-current transition-transform duration-(--duree-longue) ease-journal ${courante ? "scale-100" : "scale-0"}`}
                    />
                    <span className="[overflow-wrap:anywhere]">
                      {section.titre}
                    </span>
                  </a>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </div>
  );
}
