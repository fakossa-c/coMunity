"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Champ } from "@/components/champ";
import { Annonce, BoutonEnvoi } from "@/components/formulaire";
import { erreurDuChamp, erreurGenerale } from "@/lib/resultat";
import { seConnecter } from "./actions";

type Props = { suivant: string | null; messageInitial: string | null };

export function FormulaireConnexion({ suivant, messageInitial }: Props) {
  const [etat, action] = useActionState(seConnecter, {
    erreur: messageInitial ?? undefined,
  });

  return (
    <form action={action} className="flex flex-col gap-bloc">
      <Annonce message={erreurGenerale(etat)} erreur />
      {suivant && <input type="hidden" name="suivant" value={suivant} />}
      <Champ
        libelle="Adresse email"
        name="email"
        type="email"
        autoComplete="email"
        required
        defaultValue={etat.email}
        erreur={erreurDuChamp(etat, "email")}
      />
      <Champ
        libelle="Mot de passe"
        name="mot-de-passe"
        secret
        autoComplete="current-password"
        required
        erreur={erreurDuChamp(etat, "mot-de-passe")}
      />
      <BoutonEnvoi enCours="Connexion…" pleineLargeur>
        Se connecter
      </BoutonEnvoi>
      <Link
        href="/mot-de-passe-oublie"
        className="flex min-h-cible items-center self-start rounded-md font-headline text-label-lg text-primary underline underline-offset-4"
      >
        Mot de passe oublié ?
      </Link>
    </form>
  );
}
