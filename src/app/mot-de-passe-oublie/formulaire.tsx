"use client";

import { useActionState } from "react";
import { Champ } from "@/components/champ";
import { Annonce, BoutonEnvoi } from "@/components/formulaire";
import { demanderLien } from "./actions";

export function FormulaireMotDePasseOublie() {
  const [etat, action] = useActionState(demanderLien, {});

  return (
    <form action={action} className="flex flex-col gap-5">
      <Annonce message={etat.surEmail ? null : etat.erreur} erreur />
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
        erreur={etat.surEmail ? etat.erreur : undefined}
      />
      <BoutonEnvoi enCours="Envoi…" pleineLargeur>
        Recevoir un lien
      </BoutonEnvoi>
    </form>
  );
}
