"use client";

import { useId, useState, type ReactNode } from "react";
import { Icone } from "./icone";

/**
 * Rubrique « Détails » d'une carte d'activité de l'Accueil : un bouton de 52 px sur fond bleu
 * clair qui déplie horaire, lieu et étiquettes. Fermée au chargement.
 */
export function TiroirDetails({ children }: { children: ReactNode }) {
  const [ouvert, setOuvert] = useState(false);
  const id = useId();

  return (
    <div className="rounded-md bg-surface-container-low">
      <button
        type="button"
        id={`${id}-bouton`}
        aria-expanded={ouvert}
        aria-controls={`${id}-contenu`}
        onClick={() => setOuvert(!ouvert)}
        className="flex min-h-cible w-full items-center justify-between gap-2 rounded-md px-4 font-headline text-label-lg text-on-surface"
      >
        Détails
        <Icone nom={ouvert ? "expand_less" : "expand_more"} taille={24} />
      </button>
      <div
        id={`${id}-contenu`}
        role="region"
        aria-labelledby={`${id}-bouton`}
        hidden={!ouvert}
        className="px-4 pb-4"
      >
        {children}
      </div>
    </div>
  );
}
