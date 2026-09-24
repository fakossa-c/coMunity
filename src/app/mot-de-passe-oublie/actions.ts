"use server";

import type { ErreurFormulaire } from "@/lib/resultat";
import { clientSession } from "@/lib/supabase/serveur";

export type EtatDemande = ErreurFormulaire<"email"> & { envoye?: boolean };

export async function demanderLien(
  _: EtatDemande,
  donnees: FormData,
): Promise<EtatDemande> {
  const email = String(donnees.get("email") ?? "").trim();
  if (!email) {
    return { erreur: "Saisissez votre adresse email.", champ: "email" };
  }

  const supabase = await clientSession();
  const { error } = await supabase.auth.resetPasswordForEmail(email);
  if (error?.status === 429) {
    return {
      erreur:
        "Trop de demandes pour cette adresse. Réessayez dans quelques minutes.",
    };
  }
  // Même réponse que le compte existe ou non : la page ne révèle pas qui est inscrit.
  return { envoye: true };
}
