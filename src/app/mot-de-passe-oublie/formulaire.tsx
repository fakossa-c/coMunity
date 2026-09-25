"use client";

import { useActionState } from "react";
import { Champ } from "@/components/champ";
import { Annonce, BoutonEnvoi } from "@/components/formulaire";
import { erreurDuChamp, erreurGenerale } from "@/lib/resultat";
import { demanderLien } from "./actions";

export function FormulaireMotDePasseOublie() {
  const [etat, action] = useActionState(demanderLien, {});

  return (
    <form action={action} className="flex flex-col gap-bloc">
      <Annonce message={erreurGenerale(etat)} erreur />
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
        erreur={erreurDuChamp(etat, "email")}
      />
      <BoutonEnvoi enCours="Envoi…" pleineLargeur>
        Recevoir un lien
      </BoutonEnvoi>
    </form>
  );
}
