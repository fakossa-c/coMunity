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
  const [confirmation, setConfirmation] = useState<string | null>(null);
  const [enCours, demarrer] = useTransition();

  function deplacer(rang: number, versLeHaut: boolean) {
    // Un bouton en bout de liste ou pendant un déplacement reste focalisable (`aria-disabled`,
    // pas `disabled`) : le clavier ne perd pas sa place, il ne se passe simplement rien.
    const arrivee = versLeHaut ? rang - 1 : rang + 1;
    if (enCours || arrivee < 0 || arrivee >= sections.length) return;
    const { id, titre } = sections[rang];
    setErreur(null);
    setConfirmation(null);
    demarrer(async () => {
      const resultat = await deplacerSection(id, versLeHaut);
      if (resultat.ok)
        setConfirmation(
          `« ${titre} » passe en position ${arrivee + 1} sur ${sections.length}.`,
        );
      else setErreur(resultat.message);
    });
  }

  return (
    <div className="flex flex-col gap-space-sm">
      <Annonce message={erreur} erreur />
      <Annonce message={confirmation} />
      <ul
        aria-label="Sections du règlement intérieur"
        className="flex flex-col gap-space-sm"
      >
        {sections.map((section, rang) => (
          <li
            key={section.id}
            className="flex flex-col gap-space-sm rounded-lg border-[1.5px] border-bordure-carte bg-fond-carte p-4"
          >
            <h2 className="font-headline text-headline-sm [overflow-wrap:anywhere] text-on-surface">
              {section.titre}
            </h2>
            <div className="flex flex-wrap gap-space-sm">
              <Bouton
                variante="contour"
                icone="expand_less"
                aria-disabled={rang === 0}
                className="aria-disabled:cursor-not-allowed aria-disabled:opacity-50"
                aria-label={`Monter : ${section.titre}`}
                onClick={() => deplacer(rang, true)}
              >
                Monter
              </Bouton>
              <Bouton
                variante="contour"
                icone="expand_more"
                aria-disabled={rang === sections.length - 1}
                className="aria-disabled:cursor-not-allowed aria-disabled:opacity-50"
                aria-label={`Descendre : ${section.titre}`}
                onClick={() => deplacer(rang, false)}
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
