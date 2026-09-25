"use server";

import { revalidatePath } from "next/cache";
import type { TailleAffichage, ThemeAffichage } from "@/lib/attributs-affichage";
import type { Resultat } from "@/lib/resultat";
import { clientSession } from "@/lib/supabase/serveur";

/** Enregistre la taille des caractères choisie par la personne connectée. */
export async function choisirTaille(taille: TailleAffichage): Promise<Resultat> {
  return enregistrer({ taille });
}

/** Enregistre le thème choisi par la personne connectée. */
export async function choisirTheme(theme: ThemeAffichage): Promise<Resultat> {
  return enregistrer({ theme });
}

async function enregistrer(
  reglage: { taille: TailleAffichage } | { theme: ThemeAffichage },
): Promise<Resultat> {
  const supabase = await clientSession();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "Vous devez être connecté." };

  const { error } = await supabase
    .from("profil")
    .update(reglage)
    .eq("id", user.id);
  if (error) {
    return {
      ok: false,
      message: "Le réglage n'a pas pu être enregistré. Réessayez dans un instant.",
    };
  }

  // Toute page rendue côté serveur porte les attributs de la racine : elles doivent
  // refléter le nouveau réglage à la prochaine navigation, sans attendre une reconnexion.
  revalidatePath("/", "layout");
  return { ok: true, message: "Réglage enregistré." };
}
