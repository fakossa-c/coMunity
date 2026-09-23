"use server";

import { revalidatePath } from "next/cache";
import { clientSession } from "@/lib/supabase/serveur";
import type { Resultat } from "../resultat";

/** Remplace le code de résidence. La base refuse si la personne n'est pas membre du syndic. */
export async function regenererCode(): Promise<Resultat> {
  const supabase = await clientSession();
  const { data, error } = await supabase.rpc("regenerer_code_residence");
  if (error) {
    return {
      ok: false,
      message:
        error.code === "42501"
          ? "Seuls les membres du syndic peuvent régénérer le code."
          : "Le code n'a pas pu être régénéré. Réessayez dans un instant.",
    };
  }

  revalidatePath("/syndic/code-residence");
  return {
    ok: true,
    message: `Nouveau code : ${data}. L'ancien ne permet plus de créer un compte ; partagez celui-ci avec les résidents.`,
  };
}
