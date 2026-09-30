"use server";

import { revalidatePath } from "next/cache";
import type { Resultat } from "@/lib/resultat";
import { clientSession } from "@/lib/supabase/serveur";

const messages: Record<string, string> = {
  "42501":
    "Vous pourrez répondre dès que le conseil syndical aura validé votre compte.",
  "23505": "Vous avez déjà répondu à ce sondage.",
  "23514": "Ce sondage est clos, ou ce choix n'existe plus.",
  P0002: "Ce sondage n'existe plus.",
};

/**
 * Enregistre la réponse de la personne connectée : `choix` est le rang de l'option, à partir
 * de 1. La base vérifie son statut, la date limite et l'unicité de la réponse.
 */
export async function repondreSondage(
  sondageId: string,
  choix: number,
): Promise<Resultat> {
  const supabase = await clientSession();
  const { error } = await supabase.rpc("repondre_sondage", {
    p_sondage: sondageId,
    p_choix: choix,
  });
  if (error)
    return {
      ok: false,
      message:
        messages[error.code] ??
        "Votre réponse n'a pas pu être enregistrée. Réessayez dans un instant.",
    };

  // La liste et la page de chaque annonce : le sondage se répond sur l'une comme sur l'autre.
  revalidatePath("/annonces", "layout");
  return { ok: true, message: "Merci, votre réponse est enregistrée." };
}
