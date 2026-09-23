"use server";

import { redirect } from "next/navigation";
import { ETAGES } from "@/lib/etage";
import { LONGUEUR_MINIMALE_MOT_DE_PASSE } from "@/lib/mot-de-passe";
import { clientSession } from "@/lib/supabase/serveur";

/** Ce que la personne a saisi, rendu au formulaire en cas d'erreur (sauf les mots de passe). */
export type Saisie = {
  email: string;
  prenom: string;
  batiment: string;
  etage: string;
  code: string;
};

export type EtatInscription = {
  /** Change à chaque envoi refusé : le formulaire repart de la saisie renvoyée. */
  essai: number;
  erreur?: string;
  /** Compte créé, mais l'adresse email doit encore être confirmée. */
  confirmation?: string;
  saisie?: Saisie;
};

export async function inscrire(
  etat: EtatInscription,
  donnees: FormData,
): Promise<EtatInscription> {
  const lire = (nom: string) => String(donnees.get(nom) ?? "").trim();
  const saisie: Saisie = {
    email: lire("email"),
    prenom: lire("prenom"),
    batiment: lire("batiment"),
    etage: lire("etage"),
    code: lire("code"),
  };
  const motDePasse = String(donnees.get("mot-de-passe") ?? "");
  const confirmation = String(donnees.get("confirmation") ?? "");
  const refus = (erreur: string) => ({ essai: etat.essai + 1, erreur, saisie });

  if (Object.values(saisie).some((valeur) => valeur === "")) {
    return refus("Remplissez tous les champs pour créer votre compte.");
  }
  const etage = Number(saisie.etage);
  if (!ETAGES.includes(etage)) {
    return refus("Choisissez votre étage dans la liste.");
  }
  if (saisie.prenom.length > 40 || saisie.batiment.length > 40) {
    return refus("Le prénom et le bâtiment tiennent en 40 caractères au plus.");
  }
  if (motDePasse.length < LONGUEUR_MINIMALE_MOT_DE_PASSE) {
    return refus(
      `Choisissez un mot de passe d'au moins ${LONGUEUR_MINIMALE_MOT_DE_PASSE} caractères.`,
    );
  }
  if (motDePasse !== confirmation) {
    return refus("Les deux mots de passe ne sont pas identiques.");
  }

  const supabase = await clientSession();
  // La base revérifie le code à la création du compte ; cette première vérification
  // sert à expliquer l'erreur, que l'API d'Auth rendrait anonyme.
  const { data: codeValide, error: erreurCode } = await supabase.rpc(
    "code_residence_valide",
    { essai: saisie.code },
  );
  if (erreurCode) {
    return refus(
      "Votre compte n'a pas pu être créé. Réessayez dans un instant.",
    );
  }
  if (!codeValide) {
    return refus(
      "Ce code de résidence n'est pas le bon. Vérifiez-le dans le message du syndic qui vous l'a communiqué, ou demandez-le-lui.",
    );
  }

  const { data, error } = await supabase.auth.signUp({
    email: saisie.email,
    password: motDePasse,
    options: {
      data: {
        prenom: saisie.prenom,
        batiment: saisie.batiment,
        etage,
        code_residence: saisie.code,
      },
    },
  });
  if (error) {
    const dejaInscrit =
      "Un compte existe déjà avec cette adresse. Connectez-vous, ou choisissez « Mot de passe oublié ? » sur la page de connexion.";
    const messages: Record<string, string> = {
      user_already_exists: dejaInscrit,
      email_exists: dejaInscrit,
      email_address_invalid:
        "Saisissez une adresse email complète, par exemple prenom.nom@exemple.fr.",
      validation_failed:
        "Saisissez une adresse email complète, par exemple prenom.nom@exemple.fr.",
      weak_password: `Ce mot de passe est trop faible : au moins ${LONGUEUR_MINIMALE_MOT_DE_PASSE} caractères.`,
    };
    return refus(
      (error.code && messages[error.code]) ??
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
