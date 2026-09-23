"use client";

import { useActionState } from "react";
import {
  Annonce,
  BoutonEnvoi,
  Champ,
  ChampListe,
} from "@/components/formulaire";
import { ETAGES, libelleEtage } from "@/lib/etage";
import { LONGUEUR_MINIMALE_MOT_DE_PASSE } from "@/lib/mot-de-passe";
import { inscrire } from "./actions";

export function FormulaireInscription() {
  const [etat, action] = useActionState(inscrire, { essai: 0 });
  const saisie = etat.saisie;

  if (etat.confirmation) return <Annonce message={etat.confirmation} />;

  return (
    // La clé change à chaque refus : les champs repartent de la saisie renvoyée,
    // liste déroulante comprise, au lieu d'être vidés par React.
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
        aide="Vos voisins vous reconnaîtront à votre prénom."
        name="prenom"
        autoComplete="given-name"
        maxLength={40}
        required
        defaultValue={saisie?.prenom}
      />
      <Champ
        libelle="Bâtiment"
        aide="Par exemple : A, B ou le nom de votre bâtiment."
        name="batiment"
        maxLength={40}
        required
        defaultValue={saisie?.batiment}
      />
      <ChampListe
        libelle="Étage"
        name="etage"
        required
        defaultValue={saisie?.etage ?? ""}
      >
        <option value="" disabled>
          Choisissez votre étage
        </option>
        {ETAGES.map((etage) => (
          <option key={etage} value={etage}>
            {libelleEtage(etage)}
          </option>
        ))}
      </ChampListe>
      <Champ
        libelle="Code de la résidence"
        aide="Le syndic le communique aux résidents, par exemple dans le groupe WhatsApp de la résidence."
        name="code"
        autoComplete="off"
        autoCapitalize="characters"
        spellCheck={false}
        required
        defaultValue={saisie?.code}
      />
      <BoutonEnvoi enCours="Création du compte…">Créer mon compte</BoutonEnvoi>
    </form>
  );
}
