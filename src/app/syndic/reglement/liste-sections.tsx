"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Bouton, classesBouton } from "@/components/bouton";
import { Annonce } from "@/components/formulaire";
import { deplacerSection } from "./actions";

type Props = { sections: { id: string; titre: string }[] };

/** Les sections du règlement dans l'ordre, chacune avec ses boutons Monter, Descendre et Modifier. */
export function ListeSections({ sections }: Props) {
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, demarrer] = useTransition();

  function deplacer(id: string, versLeHaut: boolean) {
    setErreur(null);
    demarrer(async () => {
      const resultat = await deplacerSection(id, versLeHaut);
      if (!resultat.ok) setErreur(resultat.message);
    });
  }

  return (
    <div className="flex flex-col gap-space-sm">
      <Annonce message={erreur} erreur />
      <ul
        aria-label="Sections du règlement intérieur"
        className="flex flex-col gap-space-sm"
      >
        {sections.map((section, i) => (
          <li
            key={section.id}
            className="flex flex-col gap-space-sm rounded-lg border-[1.5px] border-bordure-carte bg-fond-carte p-space-md"
          >
            <h2 className="font-headline text-headline-sm text-on-surface">
              {section.titre}
            </h2>
            <div className="flex flex-wrap gap-space-sm">
              <Bouton
                variante="contour"
                icone="expand_less"
                disabled={enCours || i === 0}
                aria-label={`Monter : ${section.titre}`}
                onClick={() => deplacer(section.id, true)}
              >
                Monter
              </Bouton>
              <Bouton
                variante="contour"
                icone="expand_more"
                disabled={enCours || i === sections.length - 1}
                aria-label={`Descendre : ${section.titre}`}
                onClick={() => deplacer(section.id, false)}
              >
                Descendre
              </Bouton>
              <Link
                href={`/syndic/reglement/${section.id}`}
                aria-label={`Modifier : ${section.titre}`}
                className={classesBouton("action")}
              >
                Modifier
              </Link>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
