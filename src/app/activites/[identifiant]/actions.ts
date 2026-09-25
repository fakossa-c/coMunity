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
  P0004: "Cette activité est annulée : on ne peut plus s'y inscrire.",
};

const messagesCreateur: Record<string, string> = {
  "42501": "Seul le créateur de l'activité peut faire cela.",
  P0002: "Cette activité n'existe plus.",
  P0006:
    "Des personnes viennent de s'inscrire : annulez l'activité plutôt que de la supprimer.",
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

/** Annule l'activité de la personne connectée : ses inscrits la voient annulée, elle ne se supprime pas. */
export async function annulerActivite(identifiant: string): Promise<Resultat> {
  const supabase = await clientSession();
  const { error } = await supabase.rpc("annuler_activite", {
    p_identifiant: identifiant,
  });
  if (error) {
    return {
      ok: false,
      message:
        messagesCreateur[error.code ?? ""] ??
        "L'annulation n'a pas pu être enregistrée. Réessayez dans un instant.",
    };
  }

  revalidatePath(cheminFiche(identifiant));
  revalidatePath("/");
  revalidatePath("/activites");
  return { ok: true, message: "Activité annulée." };
}

/** Supprime l'activité de la personne connectée, puis revient à la liste de ce qu'elle organise. */
export async function supprimerActivite(identifiant: string): Promise<Resultat> {
  const supabase = await clientSession();
  const { error } = await supabase.rpc("supprimer_activite", {
    p_identifiant: identifiant,
  });
  if (error) {
    return {
      ok: false,
      message:
        messagesCreateur[error.code ?? ""] ??
        "La suppression n'a pas pu être enregistrée. Réessayez dans un instant.",
    };
  }

  revalidatePath("/");
  revalidatePath("/activites");
  redirect("/activites?onglet=j_organise");
}
