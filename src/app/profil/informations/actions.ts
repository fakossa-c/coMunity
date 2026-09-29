"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  verifierInformations,
  versProfil,
  type ChampInformations,
  type SaisieInformations,
} from "@/lib/informations-profil";
import {
  BUCKET_PHOTOS_PROFILS,
  cheminPhotoProfil,
  estCheminPhotoProfil,
} from "@/lib/photo-profil";
import { TAILLE_MAX_PHOTO } from "@/lib/photos-activite";
import type { Resultat } from "@/lib/resultat";
import { clientSession } from "@/lib/supabase/serveur";

const INFORMATIONS = "/profil/informations";

const NON_CONNECTE = { ok: false, message: "Vous devez être connecté." };

/** Le champ de visibilité de chaque information qui peut être rendue visible aux voisins. */
const colonnesVisibilite = {
  telephone: "telephone_visible",
  batiment: "batiment_visible",
  etage: "etage_visible",
} as const;

export type ChampVisible = keyof typeof colonnesVisibilite;

async function personneConnectee() {
  const supabase = await clientSession();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

/** Rend une information visible ou masquée pour les voisins. Le pseudo, lui, l'est toujours. */
export async function choisirVisibilite(
  champ: ChampVisible,
  visible: boolean,
): Promise<Resultat> {
  const colonne = colonnesVisibilite[champ];
  if (!colonne || typeof visible !== "boolean") {
    return { ok: false, message: "Ce réglage n'existe pas." };
  }
  const { supabase, user } = await personneConnectee();
  if (!user) return NON_CONNECTE;

  const { error } = await supabase
    .from("profil")
    .update({ [colonne]: visible })
    .eq("id", user.id);
  if (error) {
    return {
      ok: false,
      message:
        "Le réglage n'a pas pu être enregistré. Réessayez dans un instant.",
    };
  }

  revalidatePath(INFORMATIONS);
  return { ok: true, message: "Réglage enregistré." };
}

type Depot =
  { ok: true; chemin: string; token: string } | { ok: false; message: string };

/**
 * Autorise le navigateur à déposer la photo de la personne connectée : vérifie son poids (`taille`,
 * en octets), puis donne le chemin, dans son dossier, et un jeton à usage unique. La photo ne
 * transite pas par le serveur.
 */
export async function preparerDepotPhotoProfil(taille: number): Promise<Depot> {
  if (!(taille > 0 && taille <= TAILLE_MAX_PHOTO)) {
    return {
      ok: false,
      message: "La photo est trop lourde. Choisissez-en une autre.",
    };
  }
  const { supabase, user } = await personneConnectee();
  if (!user) return NON_CONNECTE as Depot;

  const chemin = cheminPhotoProfil(user.id, randomUUID());
  const { data, error } = await supabase.storage
    .from(BUCKET_PHOTOS_PROFILS)
    .createSignedUploadUrl(chemin);
  if (error) {
    return {
      ok: false,
      message: "La photo n'a pas pu être envoyée. Réessayez dans un instant.",
    };
  }
  return { ok: true, chemin, token: data.token };
}

export type ResultatInformations = Resultat & { champ?: ChampInformations };

/**
 * Enregistre les informations de la personne connectée. `photoChemin` est sa photo, déjà déposée
 * par le navigateur, ou `null` pour n'en avoir aucune : la photo remplacée ou retirée disparaît du
 * bucket. Revient à Mes informations une fois enregistré.
 */
export async function enregistrerInformations(
  saisie: SaisieInformations,
  photoChemin: string | null,
): Promise<ResultatInformations> {
  const refus = verifierInformations(saisie);
  if (refus) return { ok: false, message: refus.erreur, champ: refus.champ };

  const { supabase, user } = await personneConnectee();
  if (!user) return NON_CONNECTE;
  if (photoChemin !== null && !estCheminPhotoProfil(photoChemin, user.id)) {
    return { ok: false, message: "La photo n'est pas valide." };
  }

  const { data: avant } = await supabase
    .from("profil")
    .select("photo_chemin")
    .eq("id", user.id)
    .maybeSingle();
  const anciennePhoto = avant?.photo_chemin ?? null;

  const { data, error } = await supabase
    .from("profil")
    .update({ ...versProfil(saisie), photo_chemin: photoChemin })
    .eq("id", user.id)
    .select("id");
  if (error || data.length === 0) {
    return {
      ok: false,
      message:
        "Vos informations n'ont pas pu être enregistrées. Réessayez dans un instant.",
    };
  }

  // Au pire, un fichier orphelin reste dans le bucket : plus aucun profil ne le montre.
  if (anciennePhoto && anciennePhoto !== photoChemin) {
    await supabase.storage.from(BUCKET_PHOTOS_PROFILS).remove([anciennePhoto]);
  }

  // Le pseudo et la photo s'affichent dans le menu de chaque page.
  revalidatePath("/", "layout");
  redirect(`${INFORMATIONS}?fait=enregistre`);
}
