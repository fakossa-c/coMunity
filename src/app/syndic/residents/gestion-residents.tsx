"use client";

import { useState, useTransition } from "react";
import { Bouton } from "@/components/bouton";
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
      >
        {enAttente.map((resident) => (
          <LigneResident
            key={resident.id}
            resident={resident}
            icone="hourglass_top"
            onResultat={setResultat}
          >
            {(executer, enCours) => (
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
          </LigneResident>
        ))}
      </Section>

      <Section
        titre={
          valides.length === 0
            ? "Aucun résident validé"
            : valides.length === 1
              ? "1 résident validé"
              : `${valides.length} résidents validés`
        }
        liste="Résidents validés"
      >
        {valides.map((resident) => (
          <LigneResident
            key={resident.id}
            resident={resident}
            icone="how_to_reg"
            onResultat={setResultat}
          >
            {(executer, enCours) => (
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
          </LigneResident>
        ))}
      </Section>
    </div>
  );
}

function Section({
  titre,
  liste,
  children,
}: {
  titre: string;
  liste: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="mb-space-sm font-headline text-headline-sm">{titre}</h2>
      <ul aria-label={liste} className="flex flex-col gap-space-sm">
        {children}
      </ul>
    </section>
  );
}

function LigneResident({
  resident,
  icone,
  onResultat,
  children,
}: {
  resident: Resident;
  icone: NomIcone;
  onResultat: (resultat: Resultat) => void;
  children: (
    executer: (decision: Decision) => void,
    enCours: boolean,
  ) => React.ReactNode;
}) {
  const [enCours, demarrer] = useTransition();

  function executer(decision: Decision) {
    demarrer(async () => onResultat(await statuer(resident, decision)));
  }

  return (
    <li
      aria-busy={enCours}
      className="flex flex-col gap-space-sm rounded-lg border-[1.5px] border-border-distinct/20 bg-surface-container-lowest p-space-md shadow-[0_3px_0_0_rgba(24,34,48,0.08)] desktop:flex-row desktop:items-center"
    >
      <span className="flex min-w-0 flex-1 items-start gap-space-sm">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary-fixed text-on-primary-fixed">
          <Icone nom={icone} className="size-6" />
        </span>
        <span className="min-w-0">
          <span className="block font-headline text-headline-sm break-words">
            {nomComplet(resident)}
          </span>
          <span className="block text-body-lg break-words text-on-surface-variant">
            {resident.email}
          </span>
        </span>
      </span>
      <span className="flex flex-wrap gap-space-sm">
        {children(executer, enCours)}
      </span>
    </li>
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
