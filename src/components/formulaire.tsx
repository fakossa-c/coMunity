"use client";

import type { ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { Bouton, type PropsBouton } from "./bouton";

/** Bouton d'envoi d'un formulaire, désactivé pendant l'envoi. */
export function BoutonEnvoi({
  children,
  enCours,
  ...props
}: PropsBouton & { enCours: string }) {
  const { pending } = useFormStatus();
  return (
    <Bouton type="submit" disabled={pending} {...props}>
      {pending ? enCours : children}
    </Bouton>
  );
}

/**
 * Zone où s'affiche le résultat d'une action. Elle existe avant le message,
 * pour que les lecteurs d'écran l'annoncent quand il apparaît.
 */
export function Annonce({
  message,
  erreur = false,
}: {
  message: ReactNode;
  erreur?: boolean;
}) {
  return (
    <div role={erreur ? "alert" : "status"}>
      {message && (
        <p
          className={`max-w-[65ch] rounded-md p-space-md text-body-lg ${
            erreur
              ? "bg-error-container text-on-error-container"
              : "bg-fond-confirme text-texte-confirme"
          }`}
        >
          {message}
        </p>
      )}
    </div>
  );
}
