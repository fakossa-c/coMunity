"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Bouton, classesBouton } from "@/components/bouton";
import { FeuilleConfirmation } from "@/components/feuille-confirmation";
import { Icone } from "@/components/icone";
import { TitreSection } from "@/components/titre-section";
import { cheminFiche } from "@/lib/partage-activite";
import { annulerActivite, supprimerActivite } from "./actions";

type Props = {
  identifiant: string;
  annulee: boolean;
  /** Les personnes inscrites, accompagnants compris : avec elles, on annule au lieu de supprimer. */
  placesPrises: number;
};

/** Ce que retire le créateur : sans inscrit, la suppression ; avec des inscrits, l'annulation. */
const RETRAIT = {
  supprimer: {
    icone: "delete",
    libelle: "Supprimer",
    titre: "Supprimer cette activité ?",
    effet: "Cette action est définitive.",
  },
  annuler: {
    icone: "event_busy",
    libelle: "Annuler l'activité",
    titre: "Annuler cette activité ?",
    effet:
      "Les inscrits verront que vous avez annulé l'activité. Cette action est définitive.",
  },
} as const;

/**
 * Ce que son créateur peut faire d'une activité, sous la fiche : la modifier (tant qu'elle n'est
 * pas annulée), la dupliquer, puis la supprimer (personne d'inscrit) ou l'annuler (des inscrits,
 * qui le voient), derrière une confirmation.
 */
export function GestionActivite({ identifiant, annulee, placesPrises }: Props) {
  const [ouverte, setOuverte] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, demarrer] = useTransition();
  const supprimable = placesPrises === 0;
  const retrait = supprimable ? RETRAIT.supprimer : RETRAIT.annuler;
  // Annulée avec des inscrits : il ne reste rien à retirer, ils gardent la trace de l'annulation.
  const retirable = supprimable || !annulee;

  function confirmer() {
    setErreur(null);
    demarrer(async () => {
      const resultat = supprimable
        ? await supprimerActivite(identifiant)
        : await annulerActivite(identifiant);
      if (!resultat.ok) setErreur(resultat.message);
      setOuverte(false);
    });
  }

  return (
    <section className="flex flex-col gap-space-sm">
      <TitreSection>Gérer mon activité</TitreSection>
      {!annulee && (
        <Link
          href={`${cheminFiche(identifiant)}/modifier`}
          className={classesBouton("action", true)}
        >
          <Icone nom="edit" taille={24} />
          Modifier
        </Link>
      )}
      <Link
        href={`/proposer?copie=${identifiant}`}
        className={classesBouton("contour", true)}
      >
        <Icone nom="content_copy" taille={24} />
        Dupliquer
      </Link>
      {retirable && (
        <>
          <Bouton
            variante="danger"
            pleineLargeur
            icone={retrait.icone}
            disabled={enCours}
            onClick={() => setOuverte(true)}
          >
            {retrait.libelle}
          </Bouton>
          <FeuilleConfirmation
            ouverte={ouverte}
            titre={retrait.titre}
            libelleGarder="Garder l'activité"
            libelleConfirmer={retrait.libelle}
            onFermer={() => setOuverte(false)}
            onConfirmer={confirmer}
            desactive={enCours}
          >
            {retrait.effet}
          </FeuilleConfirmation>
        </>
      )}
      {erreur && (
        <p role="alert" className="text-body-md text-error">
          {erreur}
        </p>
      )}
    </section>
  );
}
