"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { Bouton } from "./bouton";

type Props = {
  ouverte: boolean;
  titre: string;
  /** L'effet de l'action, dit avant qu'on la confirme. */
  children: ReactNode;
  /** La sortie évidente : « Garder l'activité ». */
  libelleGarder: string;
  libelleConfirmer: string;
  onFermer: () => void;
  onConfirmer: () => void;
  desactive?: boolean;
};

/**
 * Feuille du bas d'écran qui explique une action irréversible avant de la confirmer, avec une
 * sortie évidente. Le parent décide de son ouverture ; fermer la feuille (bouton, touche Échap,
 * clic sur le voile) appelle `onFermer`.
 */
export function FeuilleConfirmation({
  ouverte,
  titre,
  children,
  libelleGarder,
  libelleConfirmer,
  onFermer,
  onConfirmer,
  desactive = false,
}: Props) {
  const feuille = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialogue = feuille.current;
    if (!dialogue) return;
    if (ouverte && !dialogue.open) dialogue.showModal();
    if (!ouverte && dialogue.open) dialogue.close();
  }, [ouverte]);

  return (
    <dialog
      ref={feuille}
      aria-label={titre}
      onClose={onFermer}
      onClick={(e) => {
        if (e.target === e.currentTarget) onFermer();
      }}
      className="fixed inset-x-0 top-auto bottom-0 m-0 max-h-none w-full max-w-none bg-transparent p-0 text-on-surface backdrop:bg-voile motion-safe:animate-feuille motion-safe:backdrop:animate-voile"
    >
      <div className="mx-auto flex max-w-xl flex-col gap-space-md rounded-t-feuille bg-fond-carte p-margin pb-[calc(1.25rem+env(safe-area-inset-bottom))]">
        <p className="font-headline text-headline-sm text-on-surface">
          {titre}
        </p>
        <div className="text-body-md text-on-surface-variant">{children}</div>
        <div className="flex gap-space-sm">
          <Bouton variante="contour" pleineLargeur onClick={onFermer}>
            {libelleGarder}
          </Bouton>
          <Bouton
            variante="danger"
            pleineLargeur
            disabled={desactive}
            onClick={onConfirmer}
          >
            {libelleConfirmer}
          </Bouton>
        </div>
      </div>
    </dialog>
  );
}
