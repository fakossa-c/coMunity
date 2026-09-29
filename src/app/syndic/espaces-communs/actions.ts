"use server";

import { randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  verifierEspace,
  versEspaceCommun,
  type SaisieEspace,
} from "@/lib/espaces-communs";
import { heure } from "@/lib/partage-activite";
import {
  BUCKET_PHOTOS_ESPACES,
  cheminPhotoEspace,
  estCheminPhotoEspace,
} from "@/lib/photo-espace-commun";
import { TAILLE_MAX_PHOTO } from "@/lib/photos-activite";
import type { Resultat } from "@/lib/resultat";
import { clientSession } from "@/lib/supabase/serveur";

const LISTE = "/syndic/espaces-communs";

const messages: Record<string, string> = {
  "42501": "Seuls les membres du conseil syndical gèrent les espaces communs.",
  "23505": "Un espace commun porte déjà ce nom : choisissez-en un autre.",
  "23514": "Un champ n'est pas valide : vérifiez les longueurs et la capacité.",
};

function echec(code: string | undefined, parDefaut: string): Resultat {
  return { ok: false, message: messages[code ?? ""] ?? parDefaut };
}

/** Revient à la liste, qui annonce ce qui vient d'être fait. */
function retourALaListe(
  fait: "ajoute" | "enregistre" | "supprime",
  nom: string,
): never {
  revalidatePath(LISTE);
  revalidatePath("/proposer");
  redirect(`${LISTE}?${new URLSearchParams({ fait, nom })}`);
}

/** Supprime une photo du bucket ; au pire, un fichier orphelin y reste : plus aucun espace commun ne le montre. */
async function retirerPhoto(supabase: SupabaseClient, chemin: string | null) {
  if (chemin && estCheminPhotoEspace(chemin))
    await supabase.storage.from(BUCKET_PHOTOS_ESPACES).remove([chemin]);
}

type Depot =
  { ok: true; chemin: string; token: string } | { ok: false; message: string };

/**
 * Autorise le navigateur à déposer la photo d'un espace commun : vérifie son poids (`taille`, en
 * octets), puis donne le chemin et un jeton à usage unique. La photo ne transite pas par le
 * serveur. La base ne laisse déposer que le conseil syndical.
 */
export async function preparerDepotPhoto(taille: number): Promise<Depot> {
  if (!(taille > 0 && taille <= TAILLE_MAX_PHOTO))
    return {
      ok: false,
      message: "La photo est trop lourde. Choisissez-en une autre.",
    };

  const supabase = await clientSession();
  const chemin = cheminPhotoEspace(randomUUID());
  const { data, error } = await supabase.storage
    .from(BUCKET_PHOTOS_ESPACES)
    .createSignedUploadUrl(chemin);
  if (error)
    return {
      ok: false,
      message:
        "La photo n'a pas pu être envoyée. Vous n'avez peut-être plus le droit de gérer les espaces communs.",
    };
  return { ok: true, chemin, token: data.token };
}

/**
 * Ajoute un espace commun (`id` absent) ou enregistre sa modification. `photoChemin` est la photo
 * de l'espace, déjà déposée par le navigateur, ou `null` pour n'en avoir aucune : la photo
 * remplacée ou retirée disparaît du bucket. La base ne laisse écrire que le conseil syndical.
 */
export async function enregistrerEspace(
  id: string | null,
  saisie: SaisieEspace,
  photoChemin: string | null,
): Promise<Resultat> {
  const verdict = verifierEspace(saisie);
  if (verdict.erreur) return { ok: false, message: verdict.erreur };
  if (photoChemin !== null && !estCheminPhotoEspace(photoChemin))
    return { ok: false, message: "La photo n'est pas valide." };

  const supabase = await clientSession();
  let anciennePhoto: string | null = null;
  if (id) {
    const { data: avant } = await supabase
      .from("espace_commun")
      .select("photo_chemin")
      .eq("id", id)
      .maybeSingle();
    anciennePhoto = avant?.photo_chemin ?? null;
  }

  const espace = { ...versEspaceCommun(saisie), photo_chemin: photoChemin };
  const { data, error } = id
    ? await supabase
        .from("espace_commun")
        .update(espace)
        .eq("id", id)
        .select("id")
    : await supabase.from("espace_commun").insert(espace).select("id");

  if (error)
    return echec(
      error.code,
      "L'espace commun n'a pas pu être enregistré. Réessayez dans un instant.",
    );
  if (data.length === 0)
    return {
      ok: false,
      message:
        "Cet espace commun n'existe plus, ou vous n'avez plus le droit de le modifier.",
    };

  if (anciennePhoto !== photoChemin)
    await retirerPhoto(supabase, anciennePhoto);
  return retourALaListe(id ? "enregistre" : "ajoute", espace.nom);
}

/**
 * Supprime un espace commun, avec sa photo. Les activités qui s'y tenaient gardent son nom comme
 * lieu libre, sans ses règles.
 */
export async function supprimerEspace(
  id: string,
  nom: string,
): Promise<Resultat> {
  const supabase = await clientSession();
  const { data, error } = await supabase
    .from("espace_commun")
    .delete()
    .eq("id", id)
    .select("photo_chemin");
  if (error)
    return echec(
      error.code,
      "L'espace commun n'a pas pu être supprimé. Réessayez dans un instant.",
    );
  if (data.length === 0)
    return {
      ok: false,
      message:
        "Cet espace commun n'existe plus, ou vous n'avez plus le droit de le supprimer.",
    };

  await retirerPhoto(supabase, data[0].photo_chemin);
  return retourALaListe("supprime", nom);
}

/** Règle l'heure de calme de la résidence, au-delà de laquelle l'assistant avertit. */
export async function reglerHeureCalme(heureCalme: string): Promise<Resultat> {
  if (!/^\d{2}:\d{2}$/.test(heureCalme))
    return { ok: false, message: "Indiquez une heure, par exemple 22:00." };

  const supabase = await clientSession();
  const { data, error } = await supabase
    .from("residence")
    .update({ heure_calme: heureCalme })
    .eq("id", true)
    .select("heure_calme");
  // Aucune ligne touchée : la RLS a écarté une personne hors du conseil syndical.
  if (error || data.length === 0)
    return echec(
      error ? error.code : "42501",
      "L'heure de calme n'a pas pu être enregistrée. Réessayez dans un instant.",
    );

  revalidatePath(LISTE);
  revalidatePath("/proposer");
  return {
    ok: true,
    message: `Heure de calme enregistrée : ${heure(heureCalme)}.`,
  };
}
