"use client";

import { useActionState } from "react";
import { Champ } from "@/components/champ";
import { Annonce, BoutonEnvoi } from "@/components/formulaire";
import { LONGUEUR_MINIMALE_MOT_DE_PASSE } from "@/lib/mot-de-passe";
import { LONGUEUR_MAXIMALE_NOM } from "@/lib/nom-complet";
import { erreurDuChamp, erreurGenerale } from "@/lib/resultat";
import { inscrire } from "./actions";

export function FormulaireInscription() {
  const [etat, action] = useActionState(inscrire, { essai: 0 });
  const saisie = etat.saisie;

  if (etat.confirmation) return <Annonce message={etat.confirmation} />;

  return (
    // La clé change à chaque refus : les champs repartent de la saisie renvoyée
    // au lieu d'être vidés par React.
    <form
      key={etat.essai}
      action={action}
      className="flex flex-col gap-space-md"
    >
      <Annonce message={erreurGenerale(etat)} erreur />
      <Champ
        libelle="Adresse email"
        name="email"
        type="email"
        autoComplete="email"
        required
        defaultValue={saisie?.email}
        erreur={erreurDuChamp(etat, "email")}
      />
      <Champ
        libelle="Mot de passe"
        aide={`Au moins ${LONGUEUR_MINIMALE_MOT_DE_PASSE} caractères.`}
        name="mot-de-passe"
        secret
        autoComplete="new-password"
        minLength={LONGUEUR_MINIMALE_MOT_DE_PASSE}
        required
        erreur={erreurDuChamp(etat, "mot-de-passe")}
      />
      <Champ
        libelle="Confirmez le mot de passe"
        name="confirmation"
        secret
        autoComplete="new-password"
        required
        erreur={erreurDuChamp(etat, "confirmation")}
      />
      <Champ
        libelle="Prénom"
        name="prenom"
        autoComplete="given-name"
        maxLength={LONGUEUR_MAXIMALE_NOM}
        required
        defaultValue={saisie?.prenom}
        erreur={erreurDuChamp(etat, "prenom")}
      />
      <Champ
        libelle="Nom"
        aide="Le conseil syndical s'en sert pour vérifier que vous habitez la résidence."
        name="nom"
        autoComplete="family-name"
        maxLength={LONGUEUR_MAXIMALE_NOM}
        required
        defaultValue={saisie?.nom}
        erreur={erreurDuChamp(etat, "nom")}
      />
      <BoutonEnvoi enCours="Création du compte…">Créer mon compte</BoutonEnvoi>
    </form>
  );
}
