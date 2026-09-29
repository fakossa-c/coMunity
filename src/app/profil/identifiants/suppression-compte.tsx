"use client";

import { useEffect, useRef, useState, useTransition } from "react";
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
  const explication = useRef<HTMLParagraphElement>(null);
  const supprimerLeCompte = useRef<HTMLButtonElement>(null);
  const dejaOuverte = useRef(false);

  // Le bouton cliqué disparaît : le focus passe à l'explication, puis revient au bouton si on garde
  // le compte, pour qu'un lecteur d'écran ou le clavier ne perde pas sa place.
  useEffect(() => {
    if (confirmation) {
      dejaOuverte.current = true;
      explication.current?.focus();
    } else if (dejaOuverte.current) {
      supprimerLeCompte.current?.focus();
    }
  }, [confirmation]);

  function supprimer() {
    setErreur(null);
    demarrer(async () => {
      // En cas de succès, l'action redirige : elle ne rend la main que pour dire l'échec.
      const resultat = await supprimerMonCompte();
      if (!resultat.ok) setErreur(resultat.message);
    });
  }

  return (
    <div className="mt-space-sm flex flex-col gap-space-sm border-t-[1.5px] border-bordure-carte pt-space-lg desktop:mt-0 desktop:border-t-0 desktop:pt-0">
      {confirmation ? (
        <>
          <p
            ref={explication}
            tabIndex={-1}
            className="text-body-lg text-on-surface outline-none"
          >
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
          ref={supprimerLeCompte}
          variante="fantome"
          icone="delete"
          pleineLargeur
          className="text-error! desktop:w-auto desktop:self-start"
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
