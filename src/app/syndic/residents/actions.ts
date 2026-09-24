"use server";

import { revalidatePath } from "next/cache";
import { nomComplet } from "@/lib/nom-complet";
import { clientSession } from "@/lib/supabase/serveur";
import type { Resultat } from "@/lib/resultat";

export type Resident = {
  id: string;
  email: string;
  prenom: string;
  nom: string;
};

export type Decision = "valide" | "refuse" | "retire";

const reussites: Record<Decision, (nom: string) => string> = {
  valide: (nom) =>
    `Compte de ${nom} validé : ${nom} peut maintenant participer aux activités.`,
  refuse: (nom) => `Compte de ${nom} refusé.`,
  retire: (nom) => `Accès retiré à ${nom}.`,
};

/** Valide ou refuse un résident en attente, ou retire un résident validé. La base vérifie les droits. */
export async function statuer(
  resident: Pick<Resident, "id" | "prenom" | "nom">,
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
      P0002: `Le compte de ${nomComplet(resident)} a déjà été traité, par vous ou par un collègue. La liste est à jour.`,
    };
    return {
      ok: false,
      message:
        messages[error.code] ??
        "L'opération n'a pas abouti. Réessayez dans un instant.",
    };
  }
  return { ok: true, message: reussites[decision](nomComplet(resident)) };
}
