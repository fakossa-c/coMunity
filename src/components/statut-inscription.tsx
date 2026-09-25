"use client";

import { useRef } from "react";
import { libelleStatutInscription } from "@/lib/inscription-activite";
import { Bouton } from "./bouton";
import { Icone } from "./icone";

type Props = {
  accompagnants: number;
  /** Appelée après confirmation, dans une transition côté appelant. */
  onAnnuler: () => void;
  desactive?: boolean;
};

/**
 * « J'y vais » (ou « J'y vais, avec 2 personnes »), avec l'annulation derrière une confirmation :
 * la feuille demande « Annuler votre participation ? » avant d'appeler `onAnnuler`.
 */
export function StatutInscription({
  accompagnants,
  onAnnuler,
  desactive = false,
}: Props) {
  const confirmation = useRef<HTMLDialogElement>(null);

  function demanderConfirmation() {
    confirmation.current?.showModal();
  }

  function confirmer() {
    confirmation.current?.close();
    onAnnuler();
  }

  return (
    <div className="flex w-full items-center justify-between gap-space-sm">
      <p className="flex items-center gap-2 font-headline text-body-lg text-on-surface">
        <Icone nom="check_circle" plein taille={24} className="text-primary" />
        {libelleStatutInscription(accompagnants)}
      </p>
      <Bouton
        variante="danger"
        disabled={desactive}
        onClick={demanderConfirmation}
      >
        Annuler
      </Bouton>
      <dialog
        ref={confirmation}
        aria-label="Confirmer l'annulation"
        onClick={(e) => {
          if (e.target === e.currentTarget) confirmation.current?.close();
        }}
        className="fixed inset-x-0 top-auto bottom-0 m-0 max-h-none w-full max-w-none bg-transparent p-0 text-on-surface backdrop:bg-voile motion-safe:animate-feuille motion-safe:backdrop:animate-voile"
      >
        <div className="mx-auto flex max-w-xl flex-col gap-space-md rounded-t-feuille bg-fond-carte p-margin pb-[calc(1.25rem+env(safe-area-inset-bottom))]">
          <p className="font-headline text-headline-sm text-on-surface">
            Annuler votre participation ?
          </p>
          <p className="text-body-md text-on-surface-variant">
            {accompagnants > 0
              ? "Votre place et celles de vos accompagnants redeviennent disponibles."
              : "Votre place redevient disponible."}
          </p>
          <div className="flex gap-space-sm">
            <Bouton
              variante="contour"
              pleineLargeur
              onClick={() => confirmation.current?.close()}
            >
              Garder ma place
            </Bouton>
            <Bouton variante="danger" pleineLargeur onClick={confirmer}>
              Annuler
            </Bouton>
          </div>
        </div>
      </dialog>
    </div>
  );
}
