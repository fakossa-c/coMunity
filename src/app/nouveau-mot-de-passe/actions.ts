"use server";

import { redirect } from "next/navigation";
import { LONGUEUR_MINIMALE_MOT_DE_PASSE } from "@/lib/mot-de-passe";
import type { ErreurFormulaire } from "@/lib/resultat";
import { accueilDe, lireProfil } from "@/lib/session";
import { clientSession } from "@/lib/supabase/serveur";

export type EtatMotDePasse = ErreurFormulaire<"mot-de-passe" | "confirmation">;

export async function enregistrerMotDePasse(
  _: EtatMotDePasse,
  donnees: FormData,
): Promise<EtatMotDePasse> {
  const motDePasse = String(donnees.get("mot-de-passe") ?? "");
  const confirmation = String(donnees.get("confirmation") ?? "");
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

  const supabase = await clientSession();
  const { data, error } = await supabase.auth.updateUser({
    password: motDePasse,
  });
  if (error?.code === "same_password") {
    return {
      erreur: "Choisissez un mot de passe différent de l'ancien.",
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
        "Le mot de passe n'a pas pu être enregistré. Redemandez un lien depuis « Mot de passe oublié ? ».",
    };
  }

  redirect(accueilDe(await lireProfil(supabase, data.user.id)));
}
