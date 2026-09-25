"use server";

import { redirect } from "next/navigation";
import { EMAIL_INCOMPLET } from "@/lib/email";
import {
  MOT_DE_PASSE_TROP_FAIBLE,
  refusNouveauMotDePasse,
} from "@/lib/mot-de-passe";
import { LONGUEUR_MAXIMALE_NOM } from "@/lib/nom-complet";
import { clientSession } from "@/lib/supabase/serveur";

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

const MESSAGE_DEJA_INSCRIT =
  "Un compte existe déjà avec cette adresse. Connectez-vous, ou choisissez « Mot de passe oublié ? » sur la page de connexion.";

const messagesAuth: Record<string, string> = {
  user_already_exists: MESSAGE_DEJA_INSCRIT,
  email_exists: MESSAGE_DEJA_INSCRIT,
  email_address_invalid: EMAIL_INCOMPLET,
  validation_failed: EMAIL_INCOMPLET,
  weak_password: MOT_DE_PASSE_TROP_FAIBLE,
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
  const motDePasseRefuse = refusNouveauMotDePasse(motDePasse, confirmation);
  if (motDePasseRefuse) return refus(motDePasseRefuse.erreur);

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
