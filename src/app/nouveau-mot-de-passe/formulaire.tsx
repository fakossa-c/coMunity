"use client";

import { useActionState } from "react";
import { Champ } from "@/components/champ";
import { Annonce, BoutonEnvoi } from "@/components/formulaire";
import { LONGUEUR_MINIMALE_MOT_DE_PASSE } from "@/lib/mot-de-passe";
import { erreurDuChamp, erreurGenerale } from "@/lib/resultat";
import { enregistrerMotDePasse } from "./actions";

export function FormulaireNouveauMotDePasse({ email }: { email: string }) {
  const [etat, action] = useActionState(enregistrerMotDePasse, {});

  return (
    <form action={action} className="flex flex-col gap-bloc">
      <Annonce message={erreurGenerale(etat)} erreur />
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
        secret
        autoComplete="new-password"
        minLength={LONGUEUR_MINIMALE_MOT_DE_PASSE}
        aide={`Au moins ${LONGUEUR_MINIMALE_MOT_DE_PASSE} caractères.`}
        required
        erreur={erreurDuChamp(etat, "mot-de-passe")}
      />
      <Champ
        libelle="Confirmez le mot de passe"
        name="confirmation"
        secret
        autoComplete="new-password"
        minLength={LONGUEUR_MINIMALE_MOT_DE_PASSE}
        required
        erreur={erreurDuChamp(etat, "confirmation")}
      />
      <BoutonEnvoi enCours="Enregistrement…" pleineLargeur>
        Enregistrer le mot de passe
      </BoutonEnvoi>
    </form>
  );
}
