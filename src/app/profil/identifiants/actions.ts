"use server";

import { redirect } from "next/navigation";
import { refusFormatEmail } from "@/lib/email";
import {
  refusMotDePasseAuth,
  refusNouveauMotDePasse,
} from "@/lib/mot-de-passe";
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

/** Envoie un lien à la nouvelle adresse : l'email du compte ne change qu'une fois ce lien ouvert. */
export async function modifierEmail(
  _: EtatEmail,
  donnees: FormData,
): Promise<EtatEmail> {
  const session = await sessionExigee();
  const email = String(donnees.get("email") ?? "")
    .trim()
    .toLowerCase();
  const motDePasse = String(donnees.get("mot-de-passe") ?? "");
  const formatRefuse = refusFormatEmail(email);
  if (formatRefuse) return { ...formatRefuse, email };
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
  const motDePasseRefuse = refusNouveauMotDePasse(motDePasse, confirmation);
  if (motDePasseRefuse) return motDePasseRefuse;

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
  const refusAuth = refusMotDePasseAuth(error?.code, "l'actuel");
  if (refusAuth) return refusAuth;
  if (error) {
    return {
      erreur:
        "Le mot de passe n'a pas pu être enregistré. Réessayez dans un instant.",
    };
  }

  redirect(`${IDENTIFIANTS}?fait=mot-de-passe`);
}
