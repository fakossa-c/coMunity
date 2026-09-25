"use client";

import { useActionState } from "react";
import { Champ } from "@/components/champ";
import { ChampsIdentite } from "@/components/champs-identite";
import { Annonce, BoutonEnvoi } from "@/components/formulaire";
import { LONGUEUR_MINIMALE_MOT_DE_PASSE } from "@/lib/mot-de-passe";
import { erreurDuChamp, erreurGenerale } from "@/lib/resultat";
import { enregistrerMotDePasse } from "./actions";

export function FormulaireNouveauMotDePasse({
  email,
  demanderIdentite,
}: {
  email: string;
  /** Vrai pour un collègue invité, qui n'a encore ni prénom ni nom. */
  demanderIdentite: boolean;
}) {
  const [etat, action] = useActionState(enregistrerMotDePasse, { essai: 0 });

  return (
    // La clé change à chaque refus : les champs repartent de la saisie renvoyée
    // au lieu d'être vidés par React.
    <form key={etat.essai} action={action} className="flex flex-col gap-bloc">
      <Annonce message={erreurGenerale(etat)} erreur />
      {demanderIdentite && (
        <ChampsIdentite
          saisie={etat.saisie}
          erreurs={{
            prenom: erreurDuChamp(etat, "prenom"),
            nom: erreurDuChamp(etat, "nom"),
          }}
        />
      )}
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
