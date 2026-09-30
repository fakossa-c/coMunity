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
  MAX_PHOTOS_ESPACE,
  cheminPhotoEspace,
  estCheminPhotoEspace,
} from "@/lib/photo-espace-commun";
import { TAILLE_MAX_PHOTO } from "@/lib/photos-activite";
import type { Resultat } from "@/lib/resultat";
import { clientSession } from "@/lib/supabase/serveur";

const LISTE = "/syndic/espaces-communs";

const messages: Record<string, string> = {
  "42501": "Seuls les membres du conseil syndical gèrent les espaces communs.",
  "23514":
    "Un champ n'est pas valide : vérifiez les longueurs, la capacité, les mesures et les photos.",
  "23505": "Un espace commun porte déjà ce nom : choisissez-en un autre.",
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

/** Supprime des fichiers du bucket ; au pire, des fichiers orphelins y restent : plus aucun espace commun ne les montre. */
async function retirerFichiers(
  supabase: SupabaseClient,
  chemins: (string | null)[],
) {
  const valides = chemins.filter(
    (chemin): chemin is string => !!chemin && estCheminPhotoEspace(chemin),
  );
  if (valides.length > 0)
    await supabase.storage.from(BUCKET_PHOTOS_ESPACES).remove(valides);
}

/** Les chemins des photos et du plan d'un espace commun, tels que la base les a. */
type Medias = { photos: string[]; plan_chemin: string | null };

type Depots =
  | { ok: true; depots: { chemin: string; token: string }[] }
  | { ok: false; message: string };

/**
 * Autorise le navigateur à déposer les images d'un espace commun (ses photos et son plan) :
 * vérifie le poids de chacune (`tailles`, en octets), puis donne à chacune son chemin et un jeton
 * à usage unique, dans le même ordre. Les images ne transitent pas par le serveur. La base ne
 * laisse déposer que le conseil syndical.
 */
export async function preparerDepots(tailles: number[]): Promise<Depots> {
  if (tailles.length > MAX_PHOTOS_ESPACE + 1)
    return { ok: false, message: "Il y a trop d'images à envoyer." };
  if (!tailles.every((taille) => taille > 0 && taille <= TAILLE_MAX_PHOTO))
    return {
      ok: false,
      message: "Une image est trop lourde. Choisissez-en une autre.",
    };

  const supabase = await clientSession();
  const depots = await Promise.all(
    tailles.map(async () => {
      const chemin = cheminPhotoEspace(randomUUID());
      const { data, error } = await supabase.storage
        .from(BUCKET_PHOTOS_ESPACES)
        .createSignedUploadUrl(chemin);
      return error ? null : { chemin, token: data.token };
    }),
  );
  if (depots.some((depot) => depot === null))
    return {
      ok: false,
      message:
        "Les images n'ont pas pu être envoyées. Vous n'avez peut-être plus le droit de gérer les espaces communs.",
    };
  return { ok: true, depots: depots as { chemin: string; token: string }[] };
}

/**
 * Ajoute un espace commun (`id` absent) ou enregistre sa modification. `photos` sont ses photos
 * dans l'ordre et `planChemin` son plan de situation, déjà déposés par le navigateur (`null` :
 * pas de plan) : les images remplacées ou retirées disparaissent du bucket. La base ne laisse
 * écrire que le conseil syndical.
 */
export async function enregistrerEspace(
  id: string | null,
  saisie: SaisieEspace,
  photos: string[],
  planChemin: string | null,
): Promise<Resultat> {
  const verdict = verifierEspace(saisie);
  if (verdict.erreur) return { ok: false, message: verdict.erreur };
  if (
    photos.length > MAX_PHOTOS_ESPACE ||
    !photos.every(estCheminPhotoEspace) ||
    new Set(photos).size !== photos.length
  )
    return { ok: false, message: "Les photos ne sont pas valides." };
  if (
    planChemin !== null &&
    (!estCheminPhotoEspace(planChemin) || photos.includes(planChemin))
  )
    return { ok: false, message: "Le plan n'est pas valide." };

  const supabase = await clientSession();
  let avant: Medias = { photos: [], plan_chemin: null };
  if (id) {
    const { data } = await supabase
      .from("espace_commun")
      .select("photos, plan_chemin")
      .eq("id", id)
      .maybeSingle<Medias>();
    if (data) avant = data;
  }

  const espace = {
    ...versEspaceCommun(saisie),
    photos,
    plan_chemin: planChemin,
  };
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

  await retirerFichiers(supabase, [
    ...avant.photos.filter((chemin) => !photos.includes(chemin)),
    avant.plan_chemin !== planChemin ? avant.plan_chemin : null,
  ]);
  return retourALaListe(id ? "enregistre" : "ajoute", espace.nom);
}

/**
 * Supprime un espace commun, avec ses photos et son plan. Les activités qui s'y tenaient gardent son nom comme
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
    .select("photos, plan_chemin");
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

  await retirerFichiers(supabase, [...data[0].photos, data[0].plan_chemin]);
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
