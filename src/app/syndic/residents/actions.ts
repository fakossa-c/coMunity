"use server";

import { revalidatePath } from "next/cache";
import { clientSession } from "@/lib/supabase/serveur";
import type { Resultat } from "../resultat";

export type Resident = {
  id: string;
  email: string;
  prenom: string;
  batiment: string;
  etage: number;
};

export type Decision = "valide" | "refuse" | "retire";

const reussites: Record<Decision, (prenom: string) => string> = {
  valide: (prenom) =>
    `Compte de ${prenom} validé : ${prenom} peut maintenant participer aux activités.`,
  refuse: (prenom) => `Compte de ${prenom} refusé.`,
  retire: (prenom) => `Accès retiré à ${prenom}.`,
};

/** Valide ou refuse un résident en attente, ou retire un résident validé. La base vérifie les droits. */
export async function statuer(
  resident: Pick<Resident, "id" | "prenom">,
  decision: Decision,
): Promise<Resultat> {
  const supabase = await clientSession();
  const { error } = await supabase.rpc("statuer_resident", {
    resident: resident.id,
    decision,
  });
  revalidatePath("/syndic", "layout");

  if (error) {
    const messages: Record<string, string> = {
      "42501": "Seuls les membres du syndic peuvent gérer les résidents.",
      P0002: `Le compte de ${resident.prenom} a déjà été traité, par vous ou par un collègue. La liste est à jour.`,
    };
    return {
      ok: false,
      message:
        messages[error.code] ??
        "L'opération n'a pas abouti. Réessayez dans un instant.",
    };
  }
  return { ok: true, message: reussites[decision](resident.prenom) };
}
