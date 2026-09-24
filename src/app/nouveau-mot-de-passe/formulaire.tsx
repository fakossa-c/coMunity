"use client";

import { useActionState } from "react";
import { Annonce, BoutonEnvoi, Champ } from "@/components/formulaire";
import { LONGUEUR_MINIMALE_MOT_DE_PASSE } from "@/lib/mot-de-passe";
import { enregistrerMotDePasse } from "./actions";

export function FormulaireNouveauMotDePasse({ email }: { email: string }) {
  const [etat, action] = useActionState(enregistrerMotDePasse, {});

  return (
    <form action={action} className="flex flex-col gap-space-md">
      <Annonce message={etat.erreur} erreur />
      {/* Permet au gestionnaire de mots de passe d'associer le nouveau mot de passe au bon compte. */}
      <input
        type="email"
        name="identifiant"
        autoComplete="username"
        value={email}
        readOnly
        hidden
      />
      <Champ
        libelle="Nouveau mot de passe"
        name="mot-de-passe"
        type="password"
        autoComplete="new-password"
        minLength={LONGUEUR_MINIMALE_MOT_DE_PASSE}
        aide={`Au moins ${LONGUEUR_MINIMALE_MOT_DE_PASSE} caractères.`}
        required
      />
      <Champ
        libelle="Confirmez le mot de passe"
        name="confirmation"
        type="password"
        autoComplete="new-password"
        minLength={LONGUEUR_MINIMALE_MOT_DE_PASSE}
        required
      />
      <BoutonEnvoi enCours="Enregistrement…">
        Enregistrer le mot de passe
      </BoutonEnvoi>
    </form>
  );
}
