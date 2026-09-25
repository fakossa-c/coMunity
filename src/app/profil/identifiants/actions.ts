"use server";

import { redirect } from "next/navigation";
import { LONGUEUR_MINIMALE_MOT_DE_PASSE } from "@/lib/mot-de-passe";
import type { ErreurFormulaire } from "@/lib/resultat";
import { lireSession } from "@/lib/session";
import { clientSession, verifierMotDePasse } from "@/lib/supabase/serveur";

const IDENTIFIANTS = "/profil/identifiants";

const VERIFICATION_INDISPONIBLE =
  "Votre mot de passe n'a pas pu être vérifié. Réessayez dans un instant.";

async function sessionExigee() {
  const session = await lireSession();
  if (!session)
    redirect(`/connexion?suivant=${encodeURIComponent(IDENTIFIANTS)}`);
  return session;
}

export type EtatEmail = ErreurFormulaire<"email" | "mot-de-passe"> & {
  email?: string;
};

/** Envoie un lien à la nouvelle adresse : l'e-mail du compte ne change qu'une fois ce lien ouvert. */
export async function modifierEmail(
  _: EtatEmail,
  donnees: FormData,
): Promise<EtatEmail> {
  const session = await sessionExigee();
  const email = String(donnees.get("email") ?? "")
    .trim()
    .toLowerCase();
  const motDePasse = String(donnees.get("mot-de-passe") ?? "");
  if (!/^[^\s@]+@[^\s@]+$/.test(email)) {
    return {
      erreur:
        "Saisissez une adresse e-mail complète, par exemple prenom.nom@exemple.fr.",
      champ: "email",
      email,
    };
  }
  if (email === session.email.toLowerCase()) {
    return {
      erreur: "C'est déjà votre adresse actuelle.",
      champ: "email",
      email,
    };
  }
  if (!motDePasse) {
    return {
      erreur: "Saisissez votre mot de passe.",
      champ: "mot-de-passe",
      email,
    };
  }

  const verification = await verifierMotDePasse(session.email, motDePasse);
  if (verification === "incorrect") {
    return {
      erreur: "Mot de passe incorrect.",
      champ: "mot-de-passe",
      email,
    };
  }
  if (verification === "indisponible") {
    return { erreur: VERIFICATION_INDISPONIBLE, email };
  }

  const supabase = await clientSession();
  const { error } = await supabase.auth.updateUser({ email });
  if (error?.code === "email_exists") {
    return {
      erreur: "Cette adresse est déjà celle d'un autre compte.",
      champ: "email",
      email,
    };
  }
  if (error) {
    return {
      erreur:
        "Le lien de confirmation n'a pas pu partir. Réessayez dans un instant.",
      email,
    };
  }

  redirect(IDENTIFIANTS);
}

export type EtatMotDePasse = ErreurFormulaire<
  "mot-de-passe-actuel" | "mot-de-passe" | "confirmation"
>;

export async function modifierMotDePasse(
  _: EtatMotDePasse,
  donnees: FormData,
): Promise<EtatMotDePasse> {
  const session = await sessionExigee();
  const actuel = String(donnees.get("mot-de-passe-actuel") ?? "");
  const motDePasse = String(donnees.get("mot-de-passe") ?? "");
  const confirmation = String(donnees.get("confirmation") ?? "");
  if (!actuel) {
    return {
      erreur: "Saisissez votre mot de passe actuel.",
      champ: "mot-de-passe-actuel",
    };
  }
  if (motDePasse.length < LONGUEUR_MINIMALE_MOT_DE_PASSE) {
    return {
      erreur: `Choisissez un mot de passe d'au moins ${LONGUEUR_MINIMALE_MOT_DE_PASSE} caractères.`,
      champ: "mot-de-passe",
    };
  }
  if (motDePasse !== confirmation) {
    return {
      erreur: "Les deux mots de passe ne sont pas identiques.",
      champ: "confirmation",
    };
  }

  const verification = await verifierMotDePasse(session.email, actuel);
  if (verification === "incorrect") {
    return {
      erreur: "Mot de passe actuel incorrect.",
      champ: "mot-de-passe-actuel",
    };
  }
  if (verification === "indisponible") {
    return { erreur: VERIFICATION_INDISPONIBLE };
  }

  const supabase = await clientSession();
  const { error } = await supabase.auth.updateUser({ password: motDePasse });
  if (error?.code === "same_password") {
    return {
      erreur: "Choisissez un mot de passe différent de l'actuel.",
      champ: "mot-de-passe",
    };
  }
  if (error?.code === "weak_password") {
    return {
      erreur: `Ce mot de passe est trop faible : au moins ${LONGUEUR_MINIMALE_MOT_DE_PASSE} caractères.`,
      champ: "mot-de-passe",
    };
  }
  if (error) {
    return {
      erreur:
        "Le mot de passe n'a pas pu être enregistré. Réessayez dans un instant.",
    };
  }

  redirect(`${IDENTIFIANTS}?fait=mot-de-passe`);
}
