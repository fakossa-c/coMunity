"use server";

import { randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { cheminFiche } from "@/lib/partage-activite";
import {
  BUCKET_PHOTOS_ACTIVITE,
  MAX_PHOTOS,
  TAILLE_MAX_PHOTO,
  cheminPhoto,
} from "@/lib/photos-activite";
import type { NouvelleActivite } from "@/lib/proposition-activite";
import { clientSession } from "@/lib/supabase/serveur";
import type { Resultat } from "@/lib/resultat";

/** Une photo à déposer : son chemin dans le bucket et le jeton à usage unique qui autorise le dépôt. */
export type DepotPhoto = { chemin: string; token: string };

/** Ce que rend la publication d'une activité qui a des photos : l'activité est créée, il reste à envoyer les photos. */
export type Publication =
  | { ok: false; message: string }
  | { ok: true; identifiant: string; depots: DepotPhoto[] };

const messagesPhotos: Record<string, string> = {
  "42501": "Seuls le créateur et le conseil syndical gèrent les photos.",
  P0002: "Cette activité n'existe plus.",
  P0009: `Une activité a ${MAX_PHOTOS} photos au plus.`,
  "22023": "Une photo n'est pas valide.",
};

/** Vérifie le nombre et le poids des photos annoncées par le navigateur ; `null` quand elles passent. */
function refuserPhotos(poids: number[]) {
  if (poids.length > MAX_PHOTOS)
    return `Une activité a ${MAX_PHOTOS} photos au plus.`;
  if (poids.some((octets) => !(octets > 0 && octets <= TAILLE_MAX_PHOTO)))
    return "Une photo est trop lourde. Choisissez-en une autre.";
  return null;
}

/**
 * Autorise le navigateur à déposer `nombre` photos dans le dossier de l'activité : un chemin et
 * un jeton à usage unique par photo, les fichiers ne transitent pas par le serveur. La base ne
 * laisse déposer que le créateur et le conseil syndical.
 */
async function preparerDepots(
  supabase: SupabaseClient,
  activiteId: string,
  nombre: number,
): Promise<DepotPhoto[] | null> {
  const depots: DepotPhoto[] = [];
  for (let i = 0; i < nombre; i++) {
    const chemin = cheminPhoto(activiteId, randomUUID());
    const { data, error } = await supabase.storage
      .from(BUCKET_PHOTOS_ACTIVITE)
      .createSignedUploadUrl(chemin);
    if (error) return null;
    depots.push({ chemin, token: data.token });
  }
  return depots;
}

/** Supprime des fichiers du bucket ; au pire, un fichier orphelin y reste : plus aucune activité ne le montre. */
async function retirerFichiers(supabase: SupabaseClient, chemins: string[]) {
  if (chemins.length > 0)
    await supabase.storage.from(BUCKET_PHOTOS_ACTIVITE).remove(chemins);
}

/** Les règles bloquantes d'un espace commun, que la base vérifie aussi. */
const reglesEspace: Record<string, string> = {
  P0007:
    "L'activité finit après l'heure de fermeture de l'espace commun. Revenez à l'étape 2.",
  P0008:
    "L'activité a plus de places que l'espace commun n'en accueille. Revenez à l'étape 3.",
  "23503":
    "Cet espace commun n'existe plus. Revenez à l'étape 2 pour choisir un autre lieu.",
};

const messages: Record<string, string> = {
  ...reglesEspace,
  "42501": "Seuls les comptes validés peuvent publier une activité.",
  "23514":
    "Vérifiez le titre, la date, le créneau, le lieu et le nombre de places : un champ n'est pas valide.",
  "22P02":
    "Une étiquette n'est pas reconnue. Revenez à l'étape 3 et cochez à nouveau.",
};

/**
 * Publie une activité. Sans photo, mène droit à l'écran qui donne son lien et son message
 * WhatsApp ; avec des photos (`poidsPhotos`, en octets, une par photo à envoyer), l'activité est
 * créée puis les dépôts sont rendus : le navigateur envoie les photos, puis appelle
 * `definirPhotos`. La base vérifie les droits, les contraintes et les règles bloquantes de
 * l'espace commun ; seul un échec revient au parcours.
 */
export async function publier(
  activite: NouvelleActivite,
  poidsPhotos: number[] = [],
): Promise<Publication> {
  const refus = refuserPhotos(poidsPhotos);
  if (refus) return { ok: false, message: refus };

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
    .select("id, identifiant_public")
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
  if (poidsPhotos.length === 0)
    redirect(`${cheminFiche(data.identifiant_public)}/publiee`);
  return {
    ok: true,
    identifiant: data.identifiant_public,
    // Sans dépôt (Storage indisponible), le navigateur le constate : l'activité est publiée sans ses photos.
    depots: (await preparerDepots(supabase, data.id, poidsPhotos.length)) ?? [],
  };
}

/**
 * Autorise le dépôt de `poidsPhotos.length` photos dans le dossier d'une activité existante,
 * avant l'enregistrement de sa modification.
 */
export async function preparerDepotsPhotos(
  identifiant: string,
  poidsPhotos: number[],
): Promise<
  { ok: true; depots: DepotPhoto[] } | { ok: false; message: string }
> {
  const refus = refuserPhotos(poidsPhotos);
  if (refus) return { ok: false, message: refus };

  const supabase = await clientSession();
  const { data } = await supabase
    .from("activite")
    .select("id")
    .eq("identifiant_public", identifiant)
    .maybeSingle();
  if (!data) return { ok: false, message: "Cette activité n'existe plus." };

  const depots = await preparerDepots(supabase, data.id, poidsPhotos.length);
  if (!depots)
    return {
      ok: false,
      message:
        "Les photos n'ont pas pu être envoyées. Réessayez dans un instant.",
    };
  return { ok: true, depots };
}

/**
 * Fixe la liste ordonnée des photos d'une activité, la première étant l'image de sa carte, puis
 * supprime du bucket celles qui n'y figurent plus.
 */
async function fixerPhotos(
  supabase: SupabaseClient,
  identifiant: string,
  chemins: string[],
): Promise<Resultat> {
  const { data, error } = await supabase.rpc("definir_photos_activite", {
    p_identifiant: identifiant,
    p_chemins: chemins,
  });
  if (error)
    return {
      ok: false,
      message:
        messagesPhotos[error.code ?? ""] ??
        "Les photos n'ont pas pu être enregistrées. Réessayez dans un instant.",
    };
  await retirerFichiers(supabase, data as string[]);
  revalidatePath(cheminFiche(identifiant));
  revalidatePath("/");
  return { ok: true, message: "Photos enregistrées." };
}

/** Enregistre les photos d'une activité qui vient d'être publiée, une fois envoyées. */
export async function definirPhotos(
  identifiant: string,
  chemins: string[],
): Promise<Resultat> {
  return fixerPhotos(await clientSession(), identifiant, chemins);
}

const messagesModification: Record<string, string> = {
  ...reglesEspace,
  "23514":
    "Vérifiez le titre, la date, le créneau, le lieu et le nombre de places : un champ n'est pas valide.",
  "22P02":
    "Une étiquette n'est pas reconnue. Revenez à l'étape 3 et cochez à nouveau.",
  P0005:
    "La capacité ne peut pas passer sous le nombre de personnes déjà inscrites. Revenez à l'étape 3.",
};

/**
 * Enregistre la modification d'une activité, puis revient à sa fiche. La base ne laisse passer
 * que le créateur, sur une activité non annulée : sinon aucune ligne n'est touchée. `photos` : la
 * nouvelle liste ordonnée, photos déjà envoyées comprises ; absente, les photos ne changent pas.
 */
export async function enregistrer(
  identifiant: string,
  activite: NouvelleActivite,
  photos?: string[],
): Promise<Resultat> {
  const supabase = await clientSession();
  const { data, error } = await supabase
    .from("activite")
    .update(activite)
    .eq("identifiant_public", identifiant)
    .select("identifiant_public");

  if (error) {
    return {
      ok: false,
      message:
        messagesModification[error.code ?? ""] ??
        "Les modifications n'ont pas pu être enregistrées. Réessayez dans un instant.",
    };
  }
  if (data.length === 0) {
    return {
      ok: false,
      message:
        "Cette activité n'existe plus, ou elle n'est plus modifiable (elle est annulée).",
    };
  }

  if (photos) {
    const resultat = await fixerPhotos(supabase, identifiant, photos);
    if (!resultat.ok)
      return {
        ok: false,
        message: `Les modifications sont enregistrées, mais pas les photos. ${resultat.message}`,
      };
  }

  revalidatePath(cheminFiche(identifiant));
  revalidatePath("/");
  revalidatePath("/activites");
  redirect(cheminFiche(identifiant));
}
