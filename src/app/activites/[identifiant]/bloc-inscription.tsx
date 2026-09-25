"use client";

import { useState, useTransition } from "react";
import { BarreActionFixe } from "@/components/barre-action-fixe";
import { Bouton } from "@/components/bouton";
import { Compteur } from "@/components/compteur";
import { StatutInscription } from "@/components/statut-inscription";
import {
  libelleBoutonInscription,
  placesRestantesDe,
} from "@/lib/inscription-activite";
import type { FicheActivite } from "@/lib/fiche-activite";
import { sInscrire, seDesister } from "./actions";

/**
 * Ce que peut faire la personne qui consulte la fiche : `visiteur` n'est pas connectée
 * (« Je participe » l'envoie se connecter), `en_attente` l'est mais n'est pas encore validée
 * par le conseil syndical (bouton désactivé), `valide` peut s'inscrire.
 */
export type StatutVisiteur = "visiteur" | "en_attente" | "valide";

type Props = { fiche: FicheActivite; statut: StatutVisiteur };

/**
 * L'action fixée en bas de la fiche : « Je participe » avec son compteur d'accompagnants pour
 * qui n'est pas encore inscrit, le statut « J'y vais » avec l'annulation pour qui l'est déjà.
 */
export function BlocInscription({ fiche, statut }: Props) {
  const [accompagnants, setAccompagnants] = useState(0);
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, demarrer] = useTransition();
  const inscrit = fiche.mes_accompagnants !== null;
  const placesRestantes = placesRestantesDe({
    capaciteMax: fiche.capacite_max,
    placesPrises: fiche.places_prises,
  });
  const complet = !inscrit && placesRestantes !== null && placesRestantes <= 0;

  function inscrire() {
    setErreur(null);
    demarrer(async () => {
      const resultat = await sInscrire(fiche.identifiant_public, accompagnants);
      if (!resultat.ok) setErreur(resultat.message);
    });
  }

  function annuler() {
    setErreur(null);
    demarrer(async () => {
      const resultat = await seDesister(fiche.identifiant_public);
      if (!resultat.ok) setErreur(resultat.message);
    });
  }

  if (inscrit) {
    return (
      <BarreActionFixe>
        <StatutInscription
          accompagnants={fiche.mes_accompagnants!}
          onAnnuler={annuler}
          desactive={enCours}
        />
        {erreur && <p className="text-body-md text-error">{erreur}</p>}
      </BarreActionFixe>
    );
  }

  const desactive = complet || statut === "en_attente" || enCours;

  return (
    <BarreActionFixe>
      <div className="flex w-full flex-col items-center gap-2">
        {!complet && statut === "valide" && (
          <Compteur
            valeur={accompagnants}
            onChange={setAccompagnants}
            max={placesRestantes !== null ? placesRestantes - 1 : undefined}
            label="Nombre d'accompagnants"
          />
        )}
        <Bouton
          pleineLargeur
          disabled={desactive}
          onClick={inscrire}
          className="text-body-lg"
        >
          {complet ? "Complet" : libelleBoutonInscription(accompagnants)}
        </Bouton>
        {statut === "en_attente" && (
          <p className="text-body-md text-on-surface-variant">
            Votre compte doit être validé par le conseil syndical pour vous inscrire.
          </p>
        )}
        {erreur && <p className="text-body-md text-error">{erreur}</p>}
      </div>
    </BarreActionFixe>
  );
}
