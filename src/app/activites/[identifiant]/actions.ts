"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { cheminFiche } from "@/lib/partage-activite";
import type { Resultat } from "@/lib/resultat";
import { clientSession } from "@/lib/supabase/serveur";

const messages: Record<string, string> = {
  "42501": "Seul un résident validé peut s'inscrire.",
  "23514": "Le nombre d'accompagnants n'est pas valide.",
  P0002: "Cette activité n'existe plus.",
  P0003: "Il ne reste pas assez de places.",
};

/** Inscrit la personne connectée à l'activité, avec `accompagnants` personnes en plus. */
export async function sInscrire(
  identifiant: string,
  accompagnants: number,
): Promise<Resultat> {
  const supabase = await clientSession();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/connexion?suivant=${encodeURIComponent(cheminFiche(identifiant))}`);
  }

  const { error } = await supabase.rpc("s_inscrire", {
    p_identifiant: identifiant,
    p_accompagnants: accompagnants,
  });
  if (error) {
    return {
      ok: false,
      message:
        messages[error.code ?? ""] ??
        "L'inscription n'a pas pu être enregistrée. Réessayez dans un instant.",
    };
  }

  revalidatePath(cheminFiche(identifiant));
  revalidatePath("/");
  return { ok: true, message: "Inscription confirmée." };
}

/** Annule l'inscription de la personne connectée à l'activité. */
export async function seDesister(identifiant: string): Promise<Resultat> {
  const supabase = await clientSession();
  const { error } = await supabase.rpc("se_desister", {
    p_identifiant: identifiant,
  });
  if (error) {
    return {
      ok: false,
      message:
        messages[error.code ?? ""] ??
        "L'annulation n'a pas pu être enregistrée. Réessayez dans un instant.",
    };
  }

  revalidatePath(cheminFiche(identifiant));
  revalidatePath("/");
  return { ok: true, message: "Inscription annulée." };
}
