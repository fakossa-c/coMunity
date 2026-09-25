"use client";

import { useActionState } from "react";
import { BarreActionFixe } from "@/components/barre-action-fixe";
import { Champ } from "@/components/champ";
import { Annonce, BoutonEnvoi } from "@/components/formulaire";
import { LONGUEUR_MINIMALE_MOT_DE_PASSE } from "@/lib/mot-de-passe";
import { erreurDuChamp, erreurGenerale } from "@/lib/resultat";
import { modifierMotDePasse } from "../actions";

export function FormulaireMotDePasse({ email }: { email: string }) {
  const [etat, action] = useActionState(modifierMotDePasse, {});

  return (
    <form action={action} className="flex max-w-md flex-col gap-bloc">
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
        libelle="Mot de passe actuel"
        name="mot-de-passe-actuel"
        secret
        autoComplete="current-password"
        required
        erreur={erreurDuChamp(etat, "mot-de-passe-actuel")}
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
        libelle="Confirmer le nouveau mot de passe"
        name="confirmation"
        secret
        autoComplete="new-password"
        minLength={LONGUEUR_MINIMALE_MOT_DE_PASSE}
        required
        erreur={erreurDuChamp(etat, "confirmation")}
      />
      <BarreActionFixe>
        <BoutonEnvoi enCours="Enregistrement…" pleineLargeur>
          Enregistrer
        </BoutonEnvoi>
      </BarreActionFixe>
    </form>
  );
}
