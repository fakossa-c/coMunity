"use client";

import { useActionState } from "react";
import { BarreActionFixe } from "@/components/barre-action-fixe";
import { Champ } from "@/components/champ";
import { Annonce, BoutonEnvoi } from "@/components/formulaire";
import { erreurDuChamp, erreurGenerale } from "@/lib/resultat";
import { modifierEmail } from "../actions";

export function FormulaireEmail({ actuel }: { actuel: string }) {
  const [etat, action] = useActionState(modifierEmail, {});

  return (
    <form action={action} className="flex max-w-md flex-col gap-bloc">
      <Annonce message={erreurGenerale(etat)} erreur />
      <Champ libelle="Email actuel" type="email" value={actuel} readOnly />
      <Champ
        libelle="Nouvel email"
        name="email"
        type="email"
        autoComplete="email"
        defaultValue={etat.email}
        aide="Vous recevrez un lien de confirmation à cette adresse."
        required
        erreur={erreurDuChamp(etat, "email")}
      />
      <Champ
        libelle="Mot de passe"
        name="mot-de-passe"
        secret
        autoComplete="current-password"
        aide="Pour confirmer que c'est bien vous."
        required
        erreur={erreurDuChamp(etat, "mot-de-passe")}
      />
      <BarreActionFixe>
        <BoutonEnvoi enCours="Envoi du lien…" pleineLargeur>
          Enregistrer
        </BoutonEnvoi>
      </BarreActionFixe>
    </form>
  );
}
