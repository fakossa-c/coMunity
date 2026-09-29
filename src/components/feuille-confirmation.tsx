"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { Bouton, type VarianteBouton } from "./bouton";
import { retenirLeFocus } from "./retenir-le-focus";

type Props = {
  ouverte: boolean;
  titre: string;
  /** L'effet de l'action, dit avant qu'on la confirme. */
  children: ReactNode;
  /** La sortie évidente : « Garder l'activité ». */
  libelleGarder: string;
  libelleConfirmer: string;
  /** `danger` par défaut : une action qui ne se défait pas. `action` pour une décision qui se reprend. */
  varianteConfirmer?: Extract<VarianteBouton, "danger" | "action">;
  onFermer: () => void;
  onConfirmer: () => void;
  desactive?: boolean;
};

/**
 * Feuille du bas d'écran sur mobile, pop-up centrée avec un voile sur ordinateur, qui explique
 * une action irréversible avant de la confirmer, avec une sortie évidente. Le parent décide de son
 * ouverture ; fermer la boîte (bouton, touche Échap, clic sur le voile) appelle `onFermer`. Le
 * focus y reste piégé, puis revient à l'élément qui l'a ouverte.
 */
export function FeuilleConfirmation({
  ouverte,
  titre,
  children,
  libelleGarder,
  libelleConfirmer,
  varianteConfirmer = "danger",
  onFermer,
  onConfirmer,
  desactive = false,
}: Props) {
  const feuille = useRef<HTMLDialogElement>(null);
  const declencheur = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const dialogue = feuille.current;
    if (!dialogue) return;
    if (ouverte && !dialogue.open) {
      declencheur.current = document.activeElement as HTMLElement | null;
      dialogue.showModal();
    }
    if (!ouverte && dialogue.open) dialogue.close();
  }, [ouverte]);

  /** Quelle que soit la cause de la fermeture, le focus retourne au bouton qui a ouvert la boîte. */
  function quandFermee() {
    declencheur.current?.focus();
    onFermer();
  }

  return (
    <dialog
      ref={feuille}
      aria-label={titre}
      onClose={quandFermee}
      onKeyDown={retenirLeFocus}
      onClick={(e) => {
        if (e.target === e.currentTarget) onFermer();
      }}
      className="fixed inset-x-0 top-auto bottom-0 m-0 max-h-none w-full max-w-none bg-transparent p-0 text-on-surface backdrop:bg-voile motion-safe:animate-feuille motion-safe:backdrop:animate-voile desktop:inset-0 desktop:m-auto desktop:h-fit desktop:w-[min(34rem,calc(100%-2rem))] desktop:overflow-visible desktop:motion-safe:animate-popup desktop:motion-safe:backdrop:animate-voile-journal"
    >
      <div className="mx-auto flex max-w-xl flex-col gap-space-md rounded-t-feuille bg-fond-carte p-margin pb-[calc(1.25rem+env(safe-area-inset-bottom))] desktop:max-h-[calc(100dvh-2rem)] desktop:max-w-none desktop:overflow-y-auto desktop:rounded-flottante desktop:p-8 desktop:shadow-flottante">
        <p className="font-headline text-headline-sm text-on-surface">
          {titre}
        </p>
        <div className="text-body-md text-on-surface-variant">{children}</div>
        <div className="flex gap-space-sm">
          <Bouton variante="contour" pleineLargeur onClick={onFermer}>
            {libelleGarder}
          </Bouton>
          <Bouton
            variante={varianteConfirmer}
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
