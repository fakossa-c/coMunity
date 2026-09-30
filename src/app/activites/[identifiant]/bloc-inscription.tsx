"use client";

import { useState, useTransition } from "react";
import { BarreActionFixe } from "@/components/barre-action-fixe";
import { Bouton } from "@/components/bouton";
import { Compteur } from "@/components/compteur";
import { StatutInscriptionAnnulable } from "@/components/statut-inscription";
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
 * L'inscription à l'activité : « Je participe » avec son compteur d'accompagnants pour qui n'est
 * pas encore inscrit, le statut « Vous participez » avec l'annulation pour qui l'est déjà. Sur
 * mobile, l'action est fixée en bas de la fiche ; sur ordinateur, c'est une carte collante à droite
 * du texte, qui ajoute « Votre place » et les places restantes.
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

  const tete = (
    <div className="hidden desktop:block">
      <h2 className="font-headline text-headline-md text-on-surface">
        Votre place
      </h2>
      {placesRestantes !== null && (
        <p className="mt-3 flex items-baseline gap-3">
          <span className="font-headline text-titre-journal text-texte-date">
            {Math.max(placesRestantes, 0)}
          </span>{" "}
          <span className="text-body-lg text-on-surface-variant">
            {placesRestantes === 1 ? "place restante" : "places restantes"}
          </span>
        </p>
      )}
    </div>
  );

  if (inscrit) {
    return (
      <BarreActionFixe carte>
        {tete}
        <StatutInscriptionAnnulable
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
    <BarreActionFixe carte>
      {tete}
      <div className="flex w-full flex-col items-center gap-2 desktop:items-stretch desktop:gap-5">
        {!complet && statut === "valide" && (
          <div className="flex flex-col items-center desktop:flex-row desktop:justify-between">
            <p className="hidden font-headline text-body-bold text-on-surface desktop:block">
              Accompagnants
            </p>
            <Compteur
              valeur={accompagnants}
              onChange={setAccompagnants}
              max={placesRestantes !== null ? placesRestantes - 1 : undefined}
              label="Nombre d'accompagnants"
            />
          </div>
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
          <p className="text-body-md text-on-surface-variant desktop:text-center">
            Votre compte doit être validé par le conseil syndical pour vous
            inscrire.
          </p>
        )}
        {erreur && <p className="text-body-md text-error">{erreur}</p>}
      </div>
    </BarreActionFixe>
  );
}
