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
 * Zone où s'affiche le résultat d'une action, annoncée aux lecteurs d'écran
 * (`role="alert"`/`"status"`) uniquement quand un message est présent : sans
 * message, elle ne porte aucun rôle, pour ne pas coexister avec l'alerte
 * d'un `Champ` en erreur (deux `role="alert"` à la fois sur un même écran).
 */
export function Annonce({
  message,
  erreur = false,
}: {
  message: ReactNode;
  erreur?: boolean;
}) {
  return (
    <div role={message ? (erreur ? "alert" : "status") : undefined}>
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
