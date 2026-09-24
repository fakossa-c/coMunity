"use server";

import { redirect } from "next/navigation";
import { cheminInterne } from "@/lib/chemin-interne";
import { accueilDe, lireProfil } from "@/lib/session";
import { clientSession } from "@/lib/supabase/serveur";

export type EtatConnexion = {
  erreur?: string;
  /** Champ auquel se rapporte l'erreur, affichée sous lui ; sans champ, en tête du formulaire. */
  champ?: "email" | "mot-de-passe";
  email?: string;
};

export async function seConnecter(
  _: EtatConnexion,
  donnees: FormData,
): Promise<EtatConnexion> {
  const email = String(donnees.get("email") ?? "").trim();
  const motDePasse = String(donnees.get("mot-de-passe") ?? "");
  if (!email) {
    return { erreur: "Saisissez votre adresse email.", champ: "email" };
  }
  if (!motDePasse) {
    return {
      erreur: "Saisissez votre mot de passe.",
      champ: "mot-de-passe",
      email,
    };
  }

  const supabase = await clientSession();
  const { data: connexion, error } = await supabase.auth.signInWithPassword({
    email,
    password: motDePasse,
  });
  if (error) {
    return {
      erreur:
        error.code === "invalid_credentials"
          ? "Email ou mot de passe incorrect. Vérifiez votre saisie ou choisissez « Mot de passe oublié ? »."
          : "La connexion n'a pas abouti. Réessayez dans un instant.",
      email,
    };
  }

  redirect(
    cheminInterne(donnees.get("suivant")) ??
      accueilDe(await lireProfil(supabase, connexion.user.id)),
  );
}

export async function seDeconnecter() {
  const supabase = await clientSession();
  await supabase.auth.signOut();
  redirect("/");
}
