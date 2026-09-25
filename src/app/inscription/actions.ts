"use server";

import { redirect } from "next/navigation";
import { EMAIL_INCOMPLET, refusFormatEmail } from "@/lib/email";
import {
  MOT_DE_PASSE_TROP_FAIBLE,
  refusNouveauMotDePasse,
} from "@/lib/mot-de-passe";
import { LONGUEUR_MAXIMALE_NOM } from "@/lib/nom-complet";
import type { ErreurFormulaire } from "@/lib/resultat";
import { clientSession } from "@/lib/supabase/serveur";

/** Ce que la personne a saisi, rendu au formulaire en cas d'erreur (sauf les mots de passe). */
export type Saisie = { email: string; prenom: string; nom: string };

type ChampInscription =
  "email" | "mot-de-passe" | "confirmation" | "prenom" | "nom";

export type EtatInscription = ErreurFormulaire<ChampInscription> & {
  /** Change à chaque envoi refusé : le formulaire repart de la saisie renvoyée. */
  essai: number;
  /** Compte créé, mais l'adresse email doit encore être confirmée. */
  confirmation?: string;
  saisie?: Saisie;
};

const MESSAGE_DEJA_INSCRIT =
  "Un compte existe déjà avec cette adresse. Connectez-vous, ou choisissez « Mot de passe oublié ? » sur la page de connexion.";

const messagesAuth: Record<
  string,
  { erreur: string; champ?: ChampInscription }
> = {
  user_already_exists: { erreur: MESSAGE_DEJA_INSCRIT, champ: "email" },
  email_exists: { erreur: MESSAGE_DEJA_INSCRIT, champ: "email" },
  email_address_invalid: { erreur: EMAIL_INCOMPLET, champ: "email" },
  validation_failed: { erreur: EMAIL_INCOMPLET, champ: "email" },
  weak_password: { erreur: MOT_DE_PASSE_TROP_FAIBLE, champ: "mot-de-passe" },
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
  const refus = (erreur: string, champ?: ChampInscription) => ({
    essai: etat.essai + 1,
    erreur,
    champ,
    saisie,
  });

  if (!saisie.email) return refus("Saisissez votre adresse email.", "email");
  if (!motDePasse) return refus("Choisissez un mot de passe.", "mot-de-passe");
  if (!saisie.prenom) return refus("Saisissez votre prénom.", "prenom");
  if (!saisie.nom) return refus("Saisissez votre nom.", "nom");

  const formatEmailRefuse = refusFormatEmail(saisie.email);
  if (formatEmailRefuse) return refus(formatEmailRefuse.erreur, "email");
  const prenomTropLong = saisie.prenom.length > LONGUEUR_MAXIMALE_NOM;
  const nomTropLong = saisie.nom.length > LONGUEUR_MAXIMALE_NOM;
  if (prenomTropLong || nomTropLong) {
    return refus(
      `Le prénom et le nom tiennent en ${LONGUEUR_MAXIMALE_NOM} caractères au plus.`,
      prenomTropLong ? "prenom" : "nom",
    );
  }
  const motDePasseRefuse = refusNouveauMotDePasse(motDePasse, confirmation);
  if (motDePasseRefuse)
    return refus(motDePasseRefuse.erreur, motDePasseRefuse.champ);

  // La base crée le profil du résident, en attente, à partir du prénom et du nom.
  const supabase = await clientSession();
  const { data, error } = await supabase.auth.signUp({
    email: saisie.email,
    password: motDePasse,
    options: { data: { prenom: saisie.prenom, nom: saisie.nom } },
  });
  if (error) {
    const connu = error.code && messagesAuth[error.code];
    return refus(
      connu?.erreur ??
        "Votre compte n'a pas pu être créé. Réessayez dans un instant.",
      connu?.champ,
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
