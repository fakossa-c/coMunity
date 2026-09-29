"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Bouton, classesBouton } from "@/components/bouton";
import { EtatActivite, type StatutActivite } from "@/components/etat-activite";
import { FeuilleConfirmation } from "@/components/feuille-confirmation";
import { Annonce as Message } from "@/components/formulaire";
import { Icone } from "@/components/icone";
import { TitreSection } from "@/components/titre-section";
import { cheminFiche } from "@/lib/partage-activite";
import { DecisionModeration } from "@/app/syndic/moderation/decision-moderation";
import { annulerActivite } from "./actions";

type Props = {
  identifiant: string;
  titre: string;
  statut: StatutActivite;
  /** Pourquoi l'activité a été mise en relecture ; `null` sinon. */
  raison: string | null;
};

const ETATS: Record<StatutActivite, string> = {
  publiee: "Publiée : visible de toute la résidence.",
  en_relecture:
    "Visible de son créateur et du conseil syndical seulement, jusqu'à votre décision.",
  masquee: "Visible de son créateur et du conseil syndical seulement.",
  annulee: "Annulée : ses inscrits en sont informés, elle ne se modère plus.",
};

/**
 * Ce que peut faire le conseil syndical de la fiche d'une activité : la publier, la refuser, la
 * masquer ou la rétablir selon son état, la modifier et l'annuler. Sous le corps de la fiche,
 * comme « Gérer mon activité » pour son créateur.
 */
export function ModerationConseil({
  identifiant,
  titre,
  statut,
  raison,
}: Props) {
  const [annulation, setAnnulation] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, demarrer] = useTransition();
  const annulee = statut === "annulee";

  function annuler() {
    setErreur(null);
    demarrer(async () => {
      const resultat = await annulerActivite(identifiant);
      if (!resultat.ok) setErreur(resultat.message);
      setAnnulation(false);
    });
  }

  return (
    <section
      aria-label="Modération par le conseil syndical"
      className="flex flex-col gap-space-sm"
    >
      <TitreSection>Modération par le conseil syndical</TitreSection>
      {statut !== "publiee" && (
        <EtatActivite
          statut={statut}
          capaciteMin={null}
          placesPrises={0}
          passee={false}
        />
      )}
      <p className="text-body-lg text-on-surface-variant">{ETATS[statut]}</p>
      {statut === "en_relecture" && (
        <p className="text-body-lg text-on-surface">
          Raison de la mise en relecture : {raison ?? "non précisée"}
        </p>
      )}
      <DecisionModeration
        identifiant={identifiant}
        titre={titre}
        statut={statut}
      />
      {!annulee && (
        <div className="flex flex-wrap gap-space-sm">
          <Link
            href={`${cheminFiche(identifiant)}/modifier`}
            className={classesBouton("contour")}
          >
            <Icone nom="edit" taille={24} />
            Modifier
          </Link>
          <Bouton
            variante="danger"
            icone="event_busy"
            disabled={enCours}
            onClick={() => setAnnulation(true)}
          >
            Annuler l&apos;activité
          </Bouton>
        </div>
      )}
      <FeuilleConfirmation
        ouverte={annulation}
        titre="Annuler cette activité ?"
        libelleGarder="Garder l'activité"
        libelleConfirmer="Annuler l'activité"
        onFermer={() => setAnnulation(false)}
        onConfirmer={annuler}
        desactive={enCours}
      >
        Ses inscrits verront que l&apos;activité est annulée. Cette action est
        définitive.
      </FeuilleConfirmation>
      <Message message={erreur} erreur />
    </section>
  );
}
