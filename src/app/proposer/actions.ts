"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { CategorieActivite } from "@/lib/categories-activite";
import { clientSession } from "@/lib/supabase/serveur";
import type { Resultat } from "@/lib/resultat";

export type NouvelleActivite = {
  titre: string;
  categorie: CategorieActivite;
  pictogramme: string;
  description: string;
  date_activite: string;
  heure_debut: string;
  heure_fin: string;
  lieu: string;
};

const messages: Record<string, string> = {
  "42501": "Seuls les comptes validés peuvent publier une activité.",
  "23514":
    "Vérifiez le titre, la date, le créneau et le lieu : un champ n'est pas valide.",
};

/**
 * Publie une activité, puis mène à l'écran qui donne son lien et son message WhatsApp.
 * La base vérifie les droits et les contraintes ; seul un échec revient au formulaire.
 */
export async function publier(activite: NouvelleActivite): Promise<Resultat> {
  const supabase = await clientSession();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, message: "Vous devez être connecté pour publier." };
  }

  const { data, error } = await supabase
    .from("activite")
    .insert({ ...activite, organisateur: user.id })
    .select("identifiant_public")
    .single();

  if (error) {
    return {
      ok: false,
      message:
        messages[error.code ?? ""] ??
        "L'activité n'a pas pu être publiée. Réessayez dans un instant.",
    };
  }

  revalidatePath("/");
  redirect(`/activites/${data.identifiant_public}/publiee`);
}
