"use server";

import { redirect } from "next/navigation";
import { LONGUEUR_MINIMALE_MOT_DE_PASSE } from "@/lib/mot-de-passe";
import { clientSession } from "@/lib/supabase/serveur";

/** Aligné sur la contrainte de `profil.prenom` et `profil.nom` en base. */
const LONGUEUR_MAXIMALE_NOM = 40;

/** Ce que la personne a saisi, rendu au formulaire en cas d'erreur (sauf les mots de passe). */
export type Saisie = { email: string; prenom: string; nom: string };

export type EtatInscription = {
  /** Change à chaque envoi refusé : le formulaire repart de la saisie renvoyée. */
  essai: number;
  erreur?: string;
  /** Compte créé, mais l'adresse email doit encore être confirmée. */
  confirmation?: string;
  saisie?: Saisie;
};

const MESSAGE_EMAIL_INVALIDE =
  "Saisissez une adresse email complète, par exemple prenom.nom@exemple.fr.";
const MESSAGE_DEJA_INSCRIT =
  "Un compte existe déjà avec cette adresse. Connectez-vous, ou choisissez « Mot de passe oublié ? » sur la page de connexion.";

const messagesAuth: Record<string, string> = {
  user_already_exists: MESSAGE_DEJA_INSCRIT,
  email_exists: MESSAGE_DEJA_INSCRIT,
  email_address_invalid: MESSAGE_EMAIL_INVALIDE,
  validation_failed: MESSAGE_EMAIL_INVALIDE,
  weak_password: `Ce mot de passe est trop faible : au moins ${LONGUEUR_MINIMALE_MOT_DE_PASSE} caractères.`,
};

export async function inscrire(
  etat: EtatInscription,
  donnees: FormData,
): Promise<EtatInscription> {
  const lire = (nom: string) => String(donnees.get(nom) ?? "").trim();
  const saisie: Saisie = {
    email: lire("email"),
    prenom: lire("prenom"),
    nom: lire("nom"),
  };
  const motDePasse = String(donnees.get("mot-de-passe") ?? "");
  const confirmation = String(donnees.get("confirmation") ?? "");
  const refus = (erreur: string) => ({ essai: etat.essai + 1, erreur, saisie });

  if (Object.values(saisie).some((valeur) => valeur === "")) {
    return refus("Remplissez tous les champs pour créer votre compte.");
  }
  if (
    saisie.prenom.length > LONGUEUR_MAXIMALE_NOM ||
    saisie.nom.length > LONGUEUR_MAXIMALE_NOM
  ) {
    return refus(
      `Le prénom et le nom tiennent en ${LONGUEUR_MAXIMALE_NOM} caractères au plus.`,
    );
  }
  if (motDePasse.length < LONGUEUR_MINIMALE_MOT_DE_PASSE) {
    return refus(
      `Choisissez un mot de passe d'au moins ${LONGUEUR_MINIMALE_MOT_DE_PASSE} caractères.`,
    );
  }
  if (motDePasse !== confirmation) {
    return refus("Les deux mots de passe ne sont pas identiques.");
  }

  // La base crée le profil du résident, en attente, à partir du prénom et du nom.
  const supabase = await clientSession();
  const { data, error } = await supabase.auth.signUp({
    email: saisie.email,
    password: motDePasse,
    options: { data: { prenom: saisie.prenom, nom: saisie.nom } },
  });
  if (error) {
    return refus(
      (error.code && messagesAuth[error.code]) ??
        "Votre compte n'a pas pu être créé. Réessayez dans un instant.",
    );
  }

  if (!data.session) {
    return {
      essai: etat.essai + 1,
      confirmation: `Votre compte est créé. Ouvrez l'email envoyé à ${saisie.email} pour confirmer votre adresse, puis connectez-vous.`,
    };
  }
  redirect("/");
}
