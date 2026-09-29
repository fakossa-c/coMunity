"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Bouton, classesBouton } from "@/components/bouton";
import { FeuilleConfirmation } from "@/components/feuille-confirmation";
import { Annonce as Message } from "@/components/formulaire";
import { Icone } from "@/components/icone";
import type { Resultat } from "@/lib/resultat";
import { epinglerAnnonce, supprimerAnnonce } from "./actions";

type Props = { id: string; titre: string; epinglee: boolean };

/** Ce que fait le conseil syndical d'une annonce : l'épingler, la modifier, la dupliquer, la supprimer. */
export function ActionsAnnonce({ id, titre, epinglee }: Props) {
  const [suppression, setSuppression] = useState(false);
  const [resultat, setResultat] = useState<Resultat | null>(null);
  const [enCours, demarrer] = useTransition();

  function epingler() {
    demarrer(async () => setResultat(await epinglerAnnonce(id, !epinglee)));
  }

  function supprimer() {
    demarrer(async () => {
      const reponse = await supprimerAnnonce(id, titre);
      setSuppression(false);
      setResultat(reponse);
    });
  }

  return (
    <div className="flex flex-col gap-space-sm">
      <Message message={resultat?.ok === false && resultat.message} erreur />
      <div className="flex flex-wrap gap-space-sm">
        <Bouton
          variante="contour"
          icone={epinglee ? "keep_off" : "keep"}
          onClick={epingler}
          disabled={enCours}
        >
          {epinglee ? "Désépingler" : "Épingler"}
          <span className="sr-only"> : {titre}</span>
        </Bouton>
        <Link
          href={`/syndic/annonces/${id}`}
          className={classesBouton("contour")}
        >
          <Icone nom="edit" />
          Modifier<span className="sr-only"> : {titre}</span>
        </Link>
        <Link
          href={`/syndic/annonces/nouvelle?copie=${id}`}
          className={classesBouton("contour")}
        >
          <Icone nom="content_copy" />
          Dupliquer<span className="sr-only"> : {titre}</span>
        </Link>
        <Bouton
          variante="danger"
          icone="delete"
          onClick={() => setSuppression(true)}
          disabled={enCours}
        >
          Supprimer<span className="sr-only"> : {titre}</span>
        </Bouton>
      </div>
      <FeuilleConfirmation
        ouverte={suppression}
        titre="Supprimer cette annonce ?"
        libelleGarder="Garder l'annonce"
        libelleConfirmer={enCours ? "Suppression…" : "Supprimer"}
        onFermer={() => setSuppression(false)}
        onConfirmer={supprimer}
        desactive={enCours}
      >
        Les résidents ne la verront plus. Son lien public ne mènera plus nulle
        part, même dans le groupe WhatsApp où il a été partagé. Cette action est
        définitive.
      </FeuilleConfirmation>
    </div>
  );
}
