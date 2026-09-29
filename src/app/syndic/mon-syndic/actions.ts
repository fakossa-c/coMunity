"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  BUCKET_SYNDIC,
  cheminPhotoSyndic,
  estCheminPhotoSyndic,
  nomFiche,
  verifierFiche,
  versLigneFiche,
  type SaisieFiche,
} from "@/lib/fiche-syndic";
import type { Resultat } from "@/lib/resultat";
import { clientSession } from "@/lib/supabase/serveur";

const LISTE = "/syndic/mon-syndic";

const messages: Record<string, string> = {
  "42501": "Seuls les membres du conseil syndical tiennent Mon syndic.",
  "22023":
    "Une fiche ne se relie qu'à un compte de l'espace syndic encore actif.",
  "23505": "Ce compte est déjà relié à une autre fiche.",
  "23514": "Un champ n'est pas valide : vérifiez les longueurs.",
};

function echec(code: string | undefined, parDefaut: string): Resultat {
  return { ok: false, message: messages[code ?? ""] ?? parDefaut };
}

function actualiser() {
  revalidatePath(LISTE);
  revalidatePath("/mon-syndic");
}

/** Revient à la liste, qui annonce ce qui vient d'être fait. */
function retourALaListe(
  fait: "ajoutee" | "enregistree" | "supprimee",
  nom: string,
): never {
  actualiser();
  redirect(`${LISTE}?${new URLSearchParams({ fait, nom })}`);
}

type Depot =
  { ok: true; chemin: string; token: string } | { ok: false; message: string };

/**
 * Autorise le navigateur à déposer une photo dans le bucket : donne son chemin et un jeton à
 * usage unique. La photo ne transite pas par le serveur. La base ne laisse déposer que le
 * conseil syndical.
 */
export async function preparerDepotPhoto(): Promise<Depot> {
  const supabase = await clientSession();
  const chemin = cheminPhotoSyndic(randomUUID());
  const { data, error } = await supabase.storage
    .from(BUCKET_SYNDIC)
    .createSignedUploadUrl(chemin);
  if (error)
    return {
      ok: false,
      message:
        "La photo n'a pas pu être envoyée. Vous n'avez peut-être plus le droit de modifier Mon syndic.",
    };
  return { ok: true, chemin, token: data.token };
}

/** Retire des photos du bucket. Au pire, une photo orpheline y reste : aucune fiche ne la montre. */
async function retirerPhotos(chemins: (string | null | undefined)[]) {
  const aRetirer = chemins.filter(
    (chemin): chemin is string => !!chemin && estCheminPhotoSyndic(chemin),
  );
  if (aRetirer.length === 0) return;
  const supabase = await clientSession();
  await supabase.storage.from(BUCKET_SYNDIC).remove(aRetirer);
}

/**
 * Ajoute une fiche (`id` absent, en dernière place) ou enregistre sa modification, avec la photo
 * `photoChemin` (déjà déposée, ou `null` sans photo). La base ne laisse écrire que le conseil
 * syndical.
 */
export async function enregistrerFiche(
  id: string | null,
  saisie: SaisieFiche,
  photoChemin: string | null,
): Promise<Resultat> {
  const verdict = verifierFiche(saisie);
  if (verdict.erreur) return { ok: false, message: verdict.erreur };
  if (photoChemin !== null && !estCheminPhotoSyndic(photoChemin))
    return { ok: false, message: "Cette photo n'est pas valide." };

  const supabase = await clientSession();
  let ancienne: string | null = null;
  if (id) {
    const { data } = await supabase
      .from("fiche_syndic")
      .select("photo_chemin")
      .eq("id", id)
      .maybeSingle();
    ancienne = data?.photo_chemin ?? null;
  }

  const ligne = { ...versLigneFiche(saisie), photo_chemin: photoChemin };
  const { data, error } = id
    ? await supabase
        .from("fiche_syndic")
        .update(ligne)
        .eq("id", id)
        .select("id")
    : await supabase.from("fiche_syndic").insert(ligne).select("id");

  // Une photo que la fiche ne garde pas ne sert plus à rien : la nouvelle si l'écriture a échoué,
  // l'ancienne si elle a réussi.
  if (error || !data || data.length === 0) {
    if (photoChemin !== ancienne) await retirerPhotos([photoChemin]);
    if (error)
      return echec(
        error.code,
        "La fiche n'a pas pu être enregistrée. Réessayez dans un instant.",
      );
    return {
      ok: false,
      message:
        "Cette fiche n'existe plus, ou vous n'avez plus le droit de la modifier.",
    };
  }
  if (ancienne !== photoChemin) await retirerPhotos([ancienne]);

  return retourALaListe(id ? "enregistree" : "ajoutee", nomFiche(ligne));
}

/** Supprime une fiche et sa photo. */
export async function supprimerFiche(
  id: string,
  nom: string,
): Promise<Resultat> {
  const supabase = await clientSession();
  const { data, error } = await supabase
    .from("fiche_syndic")
    .delete()
    .eq("id", id)
    .select("id, photo_chemin");
  if (error)
    return echec(
      error.code,
      "La fiche n'a pas pu être supprimée. Réessayez dans un instant.",
    );
  if (data.length === 0)
    return {
      ok: false,
      message:
        "Cette fiche n'existe plus, ou vous n'avez plus le droit de la supprimer.",
    };

  await retirerPhotos(data.map((fiche) => fiche.photo_chemin));
  return retourALaListe("supprimee", nom);
}

/** Échange une fiche avec sa voisine du dessus ou du dessous. */
export async function deplacerFiche(
  id: string,
  versLeHaut: boolean,
): Promise<Resultat> {
  const supabase = await clientSession();
  const { error } = await supabase.rpc("deplacer_fiche_syndic", {
    fiche: id,
    vers_le_haut: versLeHaut,
  });
  if (error)
    return echec(
      error.code,
      "La fiche n'a pas pu être déplacée. Réessayez dans un instant.",
    );

  actualiser();
  return { ok: true, message: "" };
}
