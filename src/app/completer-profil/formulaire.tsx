"use client";

import { useActionState } from "react";
import { ChampsIdentite } from "@/components/champs-identite";
import { Annonce, BoutonEnvoi } from "@/components/formulaire";
import { erreurDuChamp, erreurGenerale } from "@/lib/resultat";
import { completerProfil } from "./actions";

export function FormulaireCompletion({ suivant }: { suivant: string | null }) {
  const [etat, action] = useActionState(completerProfil, { essai: 0 });

  return (
    // La clé change à chaque refus : les champs repartent de la saisie renvoyée
    // au lieu d'être vidés par React.
    <form key={etat.essai} action={action} className="flex flex-col gap-bloc">
      <Annonce message={erreurGenerale(etat)} erreur />
      {suivant && <input type="hidden" name="suivant" value={suivant} />}
      <ChampsIdentite
        saisie={etat.saisie}
        erreurs={{
          prenom: erreurDuChamp(etat, "prenom"),
          nom: erreurDuChamp(etat, "nom"),
        }}
      />
      <BoutonEnvoi enCours="Enregistrement…" pleineLargeur>
        Continuer
      </BoutonEnvoi>
    </form>
  );
}
