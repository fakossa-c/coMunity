"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { cheminFiche } from "@/lib/partage-activite";
import { BUCKET_PHOTOS_ACTIVITE } from "@/lib/photos-activite";
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
  "42501":
    "Seuls le créateur de l'activité et le conseil syndical peuvent faire cela.",
  P0002: "Cette activité n'existe plus.",
  P0011:
    "Cette activité est en relecture ou masquée : elle s'annule après sa publication.",
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
    redirect(
      `/connexion?suivant=${encodeURIComponent(cheminFiche(identifiant))}`,
    );
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

/**
 * Supprime l'activité de la personne connectée et ses photos, puis revient à la liste de ce
 * qu'elle organise.
 */
export async function supprimerActivite(
  identifiant: string,
): Promise<Resultat> {
  const supabase = await clientSession();
  const { data: activite } = await supabase
    .from("activite")
    .select("id, photos")
    .eq("identifiant_public", identifiant)
    .maybeSingle();
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

  // L'activité supprimée, ses photos n'ont plus de gérant : la base laisse alors les retirer. Le
  // dossier entier part, photos jamais enregistrées comprises (envoi resté en plan).
  // Au pire, un fichier orphelin reste dans le bucket : plus aucune activité ne le montre.
  if (activite) {
    const dossier = supabase.storage.from(BUCKET_PHOTOS_ACTIVITE);
    const { data: fichiers } = await dossier.list(activite.id);
    const chemins = new Set<string>(activite.photos);
    for (const fichier of fichiers ?? [])
      chemins.add(`${activite.id}/${fichier.name}`);
    if (chemins.size > 0) await dossier.remove([...chemins]);
  }

  revalidatePath("/");
  revalidatePath("/activites");
  redirect("/activites?onglet=j_organise");
}

const messagesRetour: Record<string, string> = {
  "42501": "Seul un participant inscrit peut laisser un retour.",
  "23514": "La note doit être comprise entre 1 et 5.",
  P0002: "Cette activité n'existe plus.",
  P0003: "L'activité n'est pas encore terminée.",
};

/** Dépose ou remplace le retour de la personne connectée sur l'activité. */
export async function laisserRetour(
  identifiant: string,
  note: number,
  commentaire: string,
): Promise<Resultat> {
  const supabase = await clientSession();
  const { error } = await supabase.rpc("laisser_retour", {
    p_identifiant: identifiant,
    p_note: note,
    p_commentaire: commentaire,
  });
  if (error) {
    return {
      ok: false,
      message:
        messagesRetour[error.code ?? ""] ??
        "Votre retour n'a pas pu être enregistré. Réessayez dans un instant.",
    };
  }

  revalidatePath(cheminFiche(identifiant));
  return { ok: true, message: "Merci pour votre retour." };
}
