"use client";

import { useState, type ReactNode } from "react";
import { libelleStatutInscription } from "@/lib/inscription-activite";
import { Bouton } from "./bouton";
import { FeuilleConfirmation } from "./feuille-confirmation";
import { Icone } from "./icone";
import type { NomIcone } from "./icones";

/** Bandeau vert qui rassure sur une inscription : « J'y vais, avec 2 personnes ». */
export function StatutInscription({
  icone = "check_circle",
  children,
}: {
  icone?: NomIcone;
  children: ReactNode;
}) {
  return (
    <p className="flex items-center gap-2 rounded-md bg-fond-confirme px-4 py-3 font-headline text-body-bold text-texte-confirme">
      <Icone nom={icone} plein={icone === "check_circle"} taille={24} />
      {children}
    </p>
  );
}

type Props = {
  accompagnants: number;
  /** Appelée après confirmation, dans une transition côté appelant. */
  onAnnuler: () => void;
  desactive?: boolean;
};

/**
 * Dans la barre de la fiche : « J'y vais » (ou « J'y vais, avec 2 personnes »), avec l'annulation
 * derrière une confirmation : la feuille demande « Annuler votre participation ? » avant d'appeler
 * `onAnnuler`.
 */
export function StatutInscriptionAnnulable({
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
