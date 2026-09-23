"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Annonce, BoutonEnvoi, Champ } from "@/components/formulaire";
import { seConnecter } from "./actions";

type Props = { suivant: string | null; messageInitial: string | null };

export function FormulaireConnexion({ suivant, messageInitial }: Props) {
  const [etat, action] = useActionState(seConnecter, {
    erreur: messageInitial ?? undefined,
  });

  return (
    <form action={action} className="flex flex-col gap-space-md">
      <Annonce message={etat.erreur} erreur />
      {suivant && <input type="hidden" name="suivant" value={suivant} />}
      <Champ
        libelle="Adresse email"
        name="email"
        type="email"
        autoComplete="email"
        required
        defaultValue={etat.email}
      />
      <Champ
        libelle="Mot de passe"
        name="mot-de-passe"
        type="password"
        autoComplete="current-password"
        required
      />
      <BoutonEnvoi enCours="Connexion…">Se connecter</BoutonEnvoi>
      <Link
        href="/mot-de-passe-oublie"
        className="flex min-h-[52px] items-center self-start rounded-md font-headline text-label-lg text-primary underline underline-offset-4"
      >
        Mot de passe oublié ?
      </Link>
    </form>
  );
}
