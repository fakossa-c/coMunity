"use client";

import { useState, useTransition } from "react";
import { Bouton } from "@/components/bouton";
import { CarteLignes } from "@/components/carte-lignes";
import { Annonce } from "@/components/formulaire";
import { Icone } from "@/components/icone";
import type { NomIcone } from "@/components/icones";
import { nomComplet } from "@/lib/nom-complet";
import type { Resultat } from "@/lib/resultat";
import { statuer, type Decision, type Resident } from "./actions";

type Props = { enAttente: Resident[]; valides: Resident[] };

export function GestionResidents({ enAttente, valides }: Props) {
  const [resultat, setResultat] = useState<Resultat | null>(null);

  return (
    <div className="flex flex-col gap-space-lg">
      {/* Un seul bloc : vides, les deux zones n'ajoutent qu'un espacement. */}
      <div>
        <Annonce message={resultat?.ok && resultat.message} />
        <Annonce message={resultat?.ok === false && resultat.message} erreur />
      </div>

      <Section
        titre={
          enAttente.length === 0
            ? "Aucun compte en attente"
            : enAttente.length === 1
              ? "1 compte en attente"
              : `${enAttente.length} comptes en attente`
        }
        liste="Résidents en attente"
        residents={enAttente}
        icone="hourglass_top"
        onResultat={setResultat}
        actions={(resident, executer, enCours) => (
          <>
            <Bouton disabled={enCours} onClick={() => executer("valide")}>
              <Icone nom="how_to_reg" className="size-6" />
              Valider
              <span className="sr-only">
                {" "}
                le compte de {nomComplet(resident)}
              </span>
            </Bouton>
            <Confirmation
              libelle="Refuser"
              icone="block"
              confirmer="Confirmer le refus"
              texteEnCours="Refus…"
              enCours={enCours}
              nom={nomComplet(resident)}
              onConfirmer={() => executer("refuse")}
            />
          </>
        )}
      />

      <Section
        titre={
          valides.length === 0
            ? "Aucun résident validé"
            : valides.length === 1
              ? "1 résident validé"
              : `${valides.length} résidents validés`
        }
        liste="Résidents validés"
        residents={valides}
        icone="how_to_reg"
        onResultat={setResultat}
        actions={(resident, executer, enCours) => (
          <Confirmation
            libelle="Retirer l'accès"
            icone="person_remove"
            confirmer="Confirmer le retrait"
            texteEnCours="Retrait…"
            enCours={enCours}
            nom={nomComplet(resident)}
            onConfirmer={() => executer("retire")}
          />
        )}
      />
    </div>
  );
}

function Section({
  titre,
  liste,
  residents,
  icone,
  onResultat,
  actions,
}: {
  titre: string;
  liste: string;
  residents: Resident[];
  icone: NomIcone;
  onResultat: (resultat: Resultat) => void;
  actions: (
    resident: Resident,
    executer: (decision: Decision) => void,
    enCours: boolean,
  ) => React.ReactNode;
}) {
  return (
    <section>
      <h2 className="mb-space-sm font-headline text-headline-sm">{titre}</h2>
      <CarteLignes
        libelle={liste}
        lignes={residents.map((resident) => ({
          cle: resident.id,
          icone,
          titre: nomComplet(resident),
          detail: resident.email,
          fin: (
            <LigneActions
              resident={resident}
              onResultat={onResultat}
              actions={actions}
            />
          ),
        }))}
      />
    </section>
  );
}

function LigneActions({
  resident,
  onResultat,
  actions,
}: {
  resident: Resident;
  onResultat: (resultat: Resultat) => void;
  actions: (
    resident: Resident,
    executer: (decision: Decision) => void,
    enCours: boolean,
  ) => React.ReactNode;
}) {
  const [enCours, demarrer] = useTransition();

  function executer(decision: Decision) {
    demarrer(async () => onResultat(await statuer(resident, decision)));
  }

  return (
    <span aria-busy={enCours} className="flex flex-wrap gap-space-sm">
      {actions(resident, executer, enCours)}
    </span>
  );
}

/** Action irréversible : un premier bouton, puis la confirmation ou l'annulation. */
function Confirmation({
  libelle,
  icone,
  confirmer,
  texteEnCours,
  enCours,
  nom,
  onConfirmer,
}: {
  libelle: string;
  icone: NomIcone;
  confirmer: string;
  texteEnCours: string;
  enCours: boolean;
  nom: string;
  onConfirmer: () => void;
}) {
  const [demandee, setDemandee] = useState(false);

  if (!demandee) {
    return (
      <Bouton variante="contour" onClick={() => setDemandee(true)}>
        <Icone nom={icone} className="size-6" />
        {libelle}
        <span className="sr-only"> : {nom}</span>
      </Bouton>
    );
  }
  return (
    <>
      <Bouton
        variante="danger"
        autoFocus
        disabled={enCours}
        onClick={onConfirmer}
      >
        {enCours ? texteEnCours : confirmer}
      </Bouton>
      <Bouton
        variante="contour"
        disabled={enCours}
        onClick={() => setDemandee(false)}
      >
        Annuler
      </Bouton>
    </>
  );
}
