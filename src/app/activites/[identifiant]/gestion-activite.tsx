"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Bouton, classesBouton } from "@/components/bouton";
import { FeuilleConfirmation } from "@/components/feuille-confirmation";
import { Icone } from "@/components/icone";
import { TitreSection } from "@/components/titre-section";
import { annulerActivite, supprimerActivite } from "./actions";

type Props = {
  identifiant: string;
  annulee: boolean;
  /** Les personnes inscrites, accompagnants compris : avec elles, on annule au lieu de supprimer. */
  placesPrises: number;
};

/**
 * Ce que son créateur peut faire d'une activité, sous la fiche : la dupliquer, puis la supprimer
 * (personne d'inscrit) ou l'annuler (des inscrits, qui le voient), derrière une confirmation.
 * « Modifier » vit dans la barre du bas, comme « Je participe » pour un voisin.
 */
export function GestionActivite({ identifiant, annulee, placesPrises }: Props) {
  const [ouverte, setOuverte] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, demarrer] = useTransition();
  const supprimable = placesPrises === 0;
  // Annulée avec des inscrits : il ne reste plus rien à retirer, ils gardent la trace.
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
            icone={supprimable ? "delete" : "event_busy"}
            disabled={enCours}
            onClick={() => setOuverte(true)}
          >
            {supprimable ? "Supprimer" : "Annuler l'activité"}
          </Bouton>
          <FeuilleConfirmation
            ouverte={ouverte}
            titre={
              supprimable
                ? "Supprimer cette activité ?"
                : "Annuler cette activité ?"
            }
            libelleGarder="Garder l'activité"
            libelleConfirmer={supprimable ? "Supprimer" : "Annuler l'activité"}
            onFermer={() => setOuverte(false)}
            onConfirmer={confirmer}
            desactive={enCours}
          >
            {supprimable
              ? "Cette action est définitive."
              : "Les inscrits verront que vous avez annulé l'activité. Cette action est définitive."}
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
