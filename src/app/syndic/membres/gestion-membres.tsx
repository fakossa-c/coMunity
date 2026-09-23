"use client";

import { useState, useTransition } from "react";
import { Annonce, Bouton, BoutonEnvoi, Champ } from "@/components/formulaire";
import { Icone } from "@/components/icone";
import {
  inviterCollegue,
  retirerMembre,
  type Membre,
  type Resultat,
} from "./actions";

type Props = { membres: Membre[]; idMoi: string };

export function GestionMembres({ membres, idMoi }: Props) {
  const [resultat, setResultat] = useState<Resultat | null>(null);
  const [email, setEmail] = useState("");

  async function inviter() {
    const reponse = await inviterCollegue(email);
    setResultat(reponse);
    if (reponse.ok) setEmail("");
  }

  return (
    <div className="flex flex-col gap-space-lg">
      <Annonce message={resultat?.ok && resultat.message} />
      <Annonce message={resultat?.ok === false && resultat.message} erreur />

      <section
        aria-labelledby="titre-inviter"
        className="rounded-lg border-[1.5px] border-border-distinct/20 bg-surface-container-lowest p-space-md shadow-[0_3px_0_0_rgba(24,34,48,0.08)]"
      >
        <h2
          id="titre-inviter"
          className="mb-space-sm font-headline text-headline-sm"
        >
          Inviter un collègue
        </h2>
        <form
          action={inviter}
          className="flex flex-col gap-space-md desktop:flex-row desktop:items-end"
        >
          <Champ
            libelle="Adresse email du collègue"
            aide="Votre collègue recevra un lien pour choisir son mot de passe."
            name="email"
            type="email"
            autoComplete="off"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="flex-1"
          />
          <BoutonEnvoi enCours="Envoi…" className="desktop:mb-[34px]">
            <Icone nom="person_add" className="size-6" />
            Envoyer l&apos;invitation
          </BoutonEnvoi>
        </form>
      </section>

      <section aria-labelledby="titre-liste">
        <h2
          id="titre-liste"
          className="mb-space-sm font-headline text-headline-sm"
        >
          {membres.length === 1 ? "1 membre" : `${membres.length} membres`}
        </h2>
        <ul
          aria-label="Membres du syndic"
          className="flex flex-col gap-space-sm"
        >
          {membres.map((membre) => (
            <LigneMembre
              key={membre.id}
              membre={membre}
              estMoi={membre.id === idMoi}
              onResultat={setResultat}
            />
          ))}
        </ul>
      </section>
    </div>
  );
}

function LigneMembre({
  membre,
  estMoi,
  onResultat,
}: {
  membre: Membre;
  estMoi: boolean;
  onResultat: (resultat: Resultat) => void;
}) {
  const [confirmation, setConfirmation] = useState(false);
  const [enCours, demarrer] = useTransition();

  function retirer() {
    demarrer(async () => {
      const reponse = await retirerMembre(membre);
      onResultat(reponse);
      if (!reponse.ok) setConfirmation(false);
    });
  }

  return (
    <li className="flex flex-col gap-space-sm rounded-lg border-[1.5px] border-border-distinct/20 bg-surface-container-lowest p-space-md shadow-[0_3px_0_0_rgba(24,34,48,0.08)] desktop:flex-row desktop:items-center">
      <span className="flex min-w-0 flex-1 items-center gap-space-sm">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary-fixed text-on-primary-fixed">
          <Icone nom="shield_person" className="size-6" />
        </span>
        <span className="min-w-0 text-body-lg break-words">
          {membre.email}
          {estMoi && <span className="text-on-surface-variant"> (vous)</span>}
        </span>
      </span>
      {!estMoi &&
        (confirmation ? (
          <span className="flex flex-wrap gap-space-sm">
            <Bouton
              variante="danger"
              onClick={retirer}
              disabled={enCours}
              autoFocus
            >
              {enCours ? "Retrait…" : "Confirmer le retrait"}
            </Bouton>
            <Bouton
              variante="contour"
              onClick={() => setConfirmation(false)}
              disabled={enCours}
            >
              Annuler
            </Bouton>
          </span>
        ) : (
          <Bouton variante="contour" onClick={() => setConfirmation(true)}>
            <Icone nom="person_remove" className="size-6" />
            Retirer l&apos;accès
          </Bouton>
        ))}
    </li>
  );
}
