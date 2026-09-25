"use client";

import { useState, useTransition } from "react";
import { Bouton } from "@/components/bouton";
import { ChampTexte } from "@/components/champ";
import { Notation } from "@/components/notation";
import type { FicheActivite } from "@/lib/fiche-activite";
import { laisserRetour } from "./actions";

const MAX_COMMENTAIRE = 300;

type Props = { fiche: FicheActivite };

/**
 * Invitation à donner son avis sur une activité passée où l'on est allé : note de 1 à 5 et
 * commentaire court. Une fois le retour laissé, affiche une confirmation à la place du
 * formulaire (`mon_retour_note` renseigné). Onglet Activités › Passées (#16, amendement du
 * 24/09/2026) : composant autonome, branché sur une activité par son identifiant public, sans
 * dépendre de la liste des activités passées elle-même (#15).
 */
export function FormulaireRetour({ fiche }: Props) {
  const [note, setNote] = useState<number | null>(fiche.mon_retour_note);
  const [commentaire, setCommentaire] = useState(
    fiche.mon_retour_commentaire ?? "",
  );
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoye, setEnvoye] = useState(fiche.mon_retour_note !== null);
  const [enCours, demarrer] = useTransition();

  const commentaireInvalide =
    commentaire.trim().length === 0 || commentaire.length > MAX_COMMENTAIRE;
  const desactive = note === null || commentaireInvalide || enCours;

  function envoyer() {
    if (note === null) return;
    setErreur(null);
    demarrer(async () => {
      const resultat = await laisserRetour(
        fiche.identifiant_public,
        note,
        commentaire,
      );
      if (!resultat.ok) {
        setErreur(resultat.message);
        return;
      }
      setEnvoye(true);
    });
  }

  if (envoye) {
    return (
      <div className="flex flex-col gap-space-xs rounded-lg bg-surface-container-low p-4">
        <p className="font-headline text-label-lg text-on-surface">
          Merci pour votre avis
        </p>
        <p className="text-body-md text-on-surface-variant">
          Vous avez donné {note} / 5 : « {commentaire} »
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-space-sm">
      <p className="font-headline text-label-lg text-on-surface">
        Comment était cette activité ?
      </p>
      <Notation
        libelle="Note sur 5"
        valeur={note}
        onChange={setNote}
        disabled={enCours}
      />
      <ChampTexte
        libelle="Votre avis"
        value={commentaire}
        onChange={(evenement) => setCommentaire(evenement.target.value)}
        compteur={{ longueur: commentaire.length, max: MAX_COMMENTAIRE }}
        disabled={enCours}
      />
      <Bouton disabled={desactive} onClick={envoyer} pleineLargeur>
        Envoyer mon avis
      </Bouton>
      {erreur && <p className="text-body-md text-error">{erreur}</p>}
    </div>
  );
}
