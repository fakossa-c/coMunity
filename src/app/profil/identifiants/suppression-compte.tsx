"use client";

import { useState, useTransition } from "react";
import { Bouton } from "@/components/bouton";
import { supprimerMonCompte } from "./actions";

/**
 * Sous les identifiants, « Supprimer mon compte » : d'abord l'explication, puis le double choix.
 * Rien ne part avant « Oui, supprimer mon compte » ; « Garder mon compte » referme l'explication.
 */
export function SuppressionCompte() {
  const [confirmation, setConfirmation] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, demarrer] = useTransition();

  function supprimer() {
    setErreur(null);
    demarrer(async () => {
      // En cas de succès, l'action redirige : elle ne rend la main que pour dire l'échec.
      const resultat = await supprimerMonCompte();
      if (!resultat.ok) setErreur(resultat.message);
    });
  }

  return (
    <div className="mt-space-sm flex flex-col gap-space-sm border-t-[1.5px] border-bordure-carte pt-space-lg">
      {confirmation ? (
        <>
          <p className="text-body-lg text-on-surface">
            Supprimer votre compte efface vos informations, vos inscriptions et
            vos propositions d&apos;activités. Cette action est définitive.
          </p>
          <Bouton
            variante="danger"
            icone="delete"
            pleineLargeur
            disabled={enCours}
            onClick={supprimer}
          >
            {enCours ? "Suppression…" : "Oui, supprimer mon compte"}
          </Bouton>
          <Bouton
            variante="contour"
            pleineLargeur
            disabled={enCours}
            onClick={() => {
              setConfirmation(false);
              setErreur(null);
            }}
          >
            Garder mon compte
          </Bouton>
        </>
      ) : (
        <Bouton
          variante="fantome"
          icone="delete"
          pleineLargeur
          className="text-error!"
          onClick={() => setConfirmation(true)}
        >
          Supprimer mon compte
        </Bouton>
      )}
      {erreur && (
        <p role="alert" className="text-body-md text-error">
          {erreur}
        </p>
      )}
    </div>
  );
}
