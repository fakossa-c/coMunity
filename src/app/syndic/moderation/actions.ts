"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { CONFIRMATIONS, type Decision } from "@/lib/decision-moderation";
import { cheminFiche } from "@/lib/partage-activite";
import type { Resultat } from "@/lib/resultat";
import { clientSession } from "@/lib/supabase/serveur";

const LISTE = "/syndic/moderation";

const messages: Record<string, string> = {
  "42501": "Seuls les membres du conseil syndical modèrent les activités.",
  "23514":
    "Écrivez un message pour expliquer votre décision au créateur (500 caractères au plus).",
  P0002: "Cette activité n'existe plus.",
  P0011:
    "Cette activité a été annulée entre-temps : elle ne se modère plus. La liste est à jour.",
};

/**
 * Publie, refuse, masque ou rétablit l'activité. `refuser` et `masquer` demandent un message, que
 * son créateur lit ; `publier` en accepte un ; `retablir` n'en a pas. La base vérifie les droits.
 * Sur la liste de modération (`surLaListe`), la décision revient à la liste qui l'annonce ; sur la
 * fiche, elle en rend le résultat.
 */
export async function modererActivite(
  identifiant: string,
  titre: string,
  decision: Decision,
  message: string,
  surLaListe: boolean,
): Promise<Resultat> {
  const supabase = await clientSession();
  const { error } = await supabase.rpc("moderer_activite", {
    p_identifiant: identifiant,
    p_decision:
      decision === "publier" || decision === "retablir" ? "publier" : "masquer",
    p_message: decision === "retablir" ? null : message,
  });
  if (error) {
    return {
      ok: false,
      message:
        messages[error.code ?? ""] ??
        "La décision n'a pas pu être enregistrée. Réessayez dans un instant.",
    };
  }

  revalidatePath(LISTE);
  revalidatePath("/syndic");
  revalidatePath(cheminFiche(identifiant));
  revalidatePath("/");
  revalidatePath("/activites");
  if (surLaListe)
    redirect(`${LISTE}?${new URLSearchParams({ fait: decision, titre })}`);
  return { ok: true, message: CONFIRMATIONS[decision](titre) };
}
