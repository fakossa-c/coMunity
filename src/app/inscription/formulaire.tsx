"use client";

import { useActionState } from "react";
import { Annonce, BoutonEnvoi, Champ } from "@/components/formulaire";
import { LONGUEUR_MINIMALE_MOT_DE_PASSE } from "@/lib/mot-de-passe";
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
      <Annonce message={etat.erreur} erreur />
      <Champ
        libelle="Adresse email"
        name="email"
        type="email"
        autoComplete="email"
        required
        defaultValue={saisie?.email}
      />
      <Champ
        libelle="Mot de passe"
        aide={`Au moins ${LONGUEUR_MINIMALE_MOT_DE_PASSE} caractères.`}
        name="mot-de-passe"
        type="password"
        autoComplete="new-password"
        minLength={LONGUEUR_MINIMALE_MOT_DE_PASSE}
        required
      />
      <Champ
        libelle="Confirmez le mot de passe"
        name="confirmation"
        type="password"
        autoComplete="new-password"
        required
      />
      <Champ
        libelle="Prénom"
        name="prenom"
        autoComplete="given-name"
        maxLength={40}
        required
        defaultValue={saisie?.prenom}
      />
      <Champ
        libelle="Nom"
        aide="Le syndic s'en sert pour vérifier que vous habitez la résidence."
        name="nom"
        autoComplete="family-name"
        maxLength={40}
        required
        defaultValue={saisie?.nom}
      />
      <BoutonEnvoi enCours="Création du compte…">Créer mon compte</BoutonEnvoi>
    </form>
  );
}
