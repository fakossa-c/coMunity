"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Avatar } from "@/components/avatar";
import { Bouton, classesBouton } from "@/components/bouton";
import { Etiquette } from "@/components/etiquette";
import { Annonce } from "@/components/formulaire";
import { initialeFiche, nomFiche } from "@/lib/fiche-syndic";
import type { FicheAvecPhoto } from "@/lib/lecture-fiches-syndic";
import { deplacerFiche } from "./actions";

type Fiche = Pick<
  FicheAvecPhoto,
  "id" | "prenom" | "nom" | "photo_url" | "sur_comunity"
>;

/**
 * Les fiches de Mon syndic dans l'ordre, chacune avec ses boutons Monter, Descendre et Modifier.
 * Sur ordinateur, une ligne par fiche : la photo et le nom à gauche, les boutons à droite, qui
 * passent à la ligne quand ils ne tiennent pas à côté de 18 rem de photo et de nom.
 */
export function ListeFiches({ fiches }: { fiches: Fiche[] }) {
  const [erreur, setErreur] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<string | null>(null);
  const [enCours, demarrer] = useTransition();

  function deplacer(rang: number, versLeHaut: boolean) {
    // Un bouton en bout de liste ou pendant un déplacement reste focalisable (`aria-disabled`,
    // pas `disabled`) : le clavier ne perd pas sa place, il ne se passe simplement rien.
    const arrivee = versLeHaut ? rang - 1 : rang + 1;
    if (enCours || arrivee < 0 || arrivee >= fiches.length) return;
    const { id, ...fiche } = fiches[rang];
    setErreur(null);
    setConfirmation(null);
    demarrer(async () => {
      const resultat = await deplacerFiche(id, versLeHaut);
      if (resultat.ok)
        setConfirmation(
          `${nomFiche(fiche)} est maintenant ${arrivee === 0 ? "1re" : `${arrivee + 1}e`} sur ${fiches.length}.`,
        );
      else setErreur(resultat.message);
    });
  }

  return (
    <div className="flex flex-col gap-space-sm">
      <Annonce message={erreur} erreur />
      <Annonce message={confirmation} />
      <ul
        aria-label="Fiches de Mon syndic"
        className="flex flex-col gap-space-sm desktop:gap-4"
      >
        {fiches.map((fiche, rang) => {
          const nom = nomFiche(fiche);
          return (
            <li
              key={fiche.id}
              className="flex flex-col gap-space-sm rounded-lg border-[1.5px] border-bordure-carte bg-fond-carte p-4 desktop:flex-row desktop:flex-wrap desktop:items-center desktop:gap-x-6 desktop:px-8 desktop:py-5"
            >
              <div className="flex items-center gap-space-sm desktop:min-w-0 desktop:flex-1 desktop:basis-72">
                <Avatar
                  initiale={initialeFiche(fiche)}
                  taille={52}
                  photo={fiche.photo_url ?? undefined}
                />
                <div className="flex min-w-0 flex-col items-start gap-space-xs">
                  <h2 className="font-headline text-headline-sm [overflow-wrap:anywhere] text-on-surface">
                    {nom}
                  </h2>
                  {fiche.sur_comunity && (
                    <Etiquette ton="vert" icone="check_circle">
                      Sur coMunity
                    </Etiquette>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap gap-space-sm desktop:ml-auto">
                <Bouton
                  variante="contour"
                  icone="expand_less"
                  aria-disabled={rang === 0}
                  className="aria-disabled:cursor-not-allowed aria-disabled:opacity-50"
                  aria-label={`Monter : ${nom}`}
                  onClick={() => deplacer(rang, true)}
                >
                  Monter
                </Bouton>
                <Bouton
                  variante="contour"
                  icone="expand_more"
                  aria-disabled={rang === fiches.length - 1}
                  className="aria-disabled:cursor-not-allowed aria-disabled:opacity-50"
                  aria-label={`Descendre : ${nom}`}
                  onClick={() => deplacer(rang, false)}
                >
                  Descendre
                </Bouton>
                <Link
                  href={`/syndic/mon-syndic/${fiche.id}`}
                  aria-label={`Modifier : ${nom}`}
                  className={classesBouton("action")}
                >
                  Modifier
                </Link>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
