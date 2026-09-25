"use client";

import { useState } from "react";
import { libelleStatutInscription } from "@/lib/inscription-activite";
import { Bouton } from "./bouton";
import { FeuilleConfirmation } from "./feuille-confirmation";
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
  const [ouverte, setOuverte] = useState(false);

  return (
    <div className="flex w-full items-center justify-between gap-space-sm">
      <p className="flex items-center gap-2 font-headline text-body-lg text-on-surface">
        <Icone nom="check_circle" plein taille={24} className="text-primary" />
        {libelleStatutInscription(accompagnants)}
      </p>
      <Bouton
        variante="danger"
        disabled={desactive}
        onClick={() => setOuverte(true)}
      >
        Annuler
      </Bouton>
      <FeuilleConfirmation
        ouverte={ouverte}
        titre="Annuler votre participation ?"
        libelleGarder="Garder ma place"
        libelleConfirmer="Annuler"
        onFermer={() => setOuverte(false)}
        onConfirmer={() => {
          setOuverte(false);
          onAnnuler();
        }}
      >
        {accompagnants > 0
          ? "Votre place et celles de vos accompagnants redeviennent disponibles."
          : "Votre place redevient disponible."}
      </FeuilleConfirmation>
    </div>
  );
}
