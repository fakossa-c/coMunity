"use client";

import { useActionState } from "react";
import { Annonce, BoutonEnvoi, Champ } from "@/components/formulaire";
import { demanderLien } from "./actions";

export function FormulaireMotDePasseOublie() {
  const [etat, action] = useActionState(demanderLien, {});

  return (
    <form action={action} className="flex flex-col gap-space-md">
      <Annonce message={etat.erreur} erreur />
      <Annonce
        message={
          etat.envoye &&
          "Si un compte existe pour cette adresse, un email vient de vous être envoyé. Ouvrez le lien qu'il contient pour choisir un nouveau mot de passe."
        }
      />
      <Champ
        libelle="Adresse email"
        name="email"
        type="email"
        autoComplete="email"
        required
      />
      <BoutonEnvoi enCours="Envoi…">Recevoir un lien</BoutonEnvoi>
    </form>
  );
}
