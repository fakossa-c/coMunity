"use server";

import { randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  BUCKET_ANNONCES,
  cheminDeDepot,
  estCheminDeFichier,
  verifierAnnonce,
  verifierFichier,
  versLigneAnnonce,
  type GenreFichier,
  type SaisieAnnonce,
} from "@/lib/annonces";
import type { Resultat } from "@/lib/resultat";
import {
  verifierSondage,
  versLigneSondage,
  type SaisieSondage,
} from "@/lib/sondages";
import { clientSession } from "@/lib/supabase/serveur";

const LISTE = "/syndic/annonces";

const messages: Record<string, string> = {
  "42501": "Seuls les membres du conseil syndical gèrent les annonces.",
  "23514": "Un champ n'est pas valide : vérifiez les longueurs.",
};

function echec(code: string | undefined, parDefaut: string): Resultat {
  return { ok: false, message: messages[code ?? ""] ?? parDefaut };
}

function actualiser() {
  revalidatePath(LISTE);
  revalidatePath("/annonces");
}

/** Revient à la liste, qui annonce ce qui vient d'être fait. */
function retourALaListe(
  fait: "publiee" | "enregistree" | "supprimee",
  titre: string,
): never {
  actualiser();
  redirect(`${LISTE}?${new URLSearchParams({ fait, titre })}`);
}

/**
 * Supprime du bucket les fichiers que plus aucune annonce n'utilise : une annonce dupliquée
 * partage les fichiers de l'original tant que l'un des deux existe.
 */
async function retirerFichiersOrphelins(
  supabase: SupabaseClient,
  chemins: (string | null)[],
) {
  const aVerifier = [...new Set(chemins)].filter(
    (chemin): chemin is string => chemin !== null && estCheminDeFichier(chemin),
  );
  const orphelins: string[] = [];
  for (const chemin of aVerifier) {
    const { count } = await supabase
      .from("annonce")
      .select("id", { count: "exact", head: true })
      .or(`photo_chemin.eq.${chemin},document_chemin.eq.${chemin}`);
    if (count === 0) orphelins.push(chemin);
  }
  // Au pire, un fichier orphelin reste dans le bucket : il n'est plus lié à aucune annonce.
  if (orphelins.length > 0)
    await supabase.storage.from(BUCKET_ANNONCES).remove(orphelins);
}

type Depot =
  { ok: true; chemin: string; token: string } | { ok: false; message: string };

/**
 * Autorise le navigateur à déposer un fichier dans le bucket : vérifie son format et son poids,
 * puis donne le chemin et un jeton à usage unique. Le fichier ne transite pas par le serveur.
 * La base ne laisse déposer que le conseil syndical.
 */
export async function preparerDepot(
  genre: GenreFichier,
  fichier: { nom: string; type: string; taille: number },
): Promise<Depot> {
  const refus = verifierFichier(
    { type: fichier.type, size: fichier.taille },
    genre,
  );
  if (refus) return { ok: false, message: refus };

  const supabase = await clientSession();
  const chemin = cheminDeDepot(randomUUID(), fichier.nom, fichier.type);
  const { data, error } = await supabase.storage
    .from(BUCKET_ANNONCES)
    .createSignedUploadUrl(chemin);
  if (error)
    return {
      ok: false,
      message:
        "Le fichier n'a pas pu être envoyé. Vous n'avez peut-être plus le droit de publier des annonces.",
    };
  return { ok: true, chemin, token: data.token };
}

/**
 * Publie une annonce (`id` absent) ou enregistre sa modification. La base ne laisse écrire que
 * le conseil syndical. `sondage` est le sondage à joindre à une annonce de type sondage qui n'en
 * a pas encore ; `null` quand il n'y en a pas à joindre.
 */
export async function enregistrerAnnonce(
  id: string | null,
  saisie: SaisieAnnonce,
  sondage: SaisieSondage | null = null,
): Promise<Resultat> {
  const supabase = await clientSession();
  let anciens: (string | null)[] = [];
  let expirationEnregistree: string | null = null;
  if (id) {
    const { data } = await supabase
      .from("annonce")
      .select("photo_chemin, document_chemin, expire_le")
      .eq("id", id)
      .maybeSingle();
    anciens = [data?.photo_chemin ?? null, data?.document_chemin ?? null];
    expirationEnregistree = data?.expire_le ?? null;
  }

  const verdict = verifierAnnonce(saisie, undefined, expirationEnregistree);
  if (verdict.erreur) return { ok: false, message: verdict.erreur };
  const sondageAJoindre = saisie.type === "sondage" ? sondage : null;
  if (sondageAJoindre) {
    const verdictSondage = verifierSondage(sondageAJoindre);
    if (verdictSondage.erreur)
      return { ok: false, message: verdictSondage.erreur };
  }
  for (const chemin of [saisie.photo_chemin, saisie.document_chemin]) {
    if (chemin !== null && !estCheminDeFichier(chemin))
      return { ok: false, message: "Un fichier joint n'est pas valide." };
  }

  const annonce = versLigneAnnonce(saisie);
  const { data, error } = id
    ? await supabase.from("annonce").update(annonce).eq("id", id).select("id")
    : await supabase.from("annonce").insert(annonce).select("id");
  if (error)
    return echec(
      error.code,
      "L'annonce n'a pas pu être enregistrée. Réessayez dans un instant.",
    );
  if (data.length === 0)
    return {
      ok: false,
      message:
        "Cette annonce n'existe plus, ou vous n'avez plus le droit de la modifier.",
    };

  if (sondageAJoindre) {
    const { error: erreurSondage } = await supabase.from("sondage").insert({
      annonce_id: data[0].id,
      ...versLigneSondage(sondageAJoindre),
    });
    if (erreurSondage) {
      // Une annonce de sondage sans sondage ne dirait rien : la publication échoue en entier.
      if (!id) await supabase.from("annonce").delete().eq("id", data[0].id);
      return echec(
        erreurSondage.code,
        "Le sondage n'a pas pu être enregistré. Réessayez dans un instant.",
      );
    }
  }

  await retirerFichiersOrphelins(supabase, anciens);
  return retourALaListe(id ? "enregistree" : "publiee", annonce.titre);
}

/** Épingle une annonce en tête de la liste, ou la désépingle. */
export async function epinglerAnnonce(
  id: string,
  epinglee: boolean,
): Promise<Resultat> {
  const supabase = await clientSession();
  const { data, error } = await supabase
    .from("annonce")
    .update({ epinglee })
    .eq("id", id)
    .select("id");
  if (error || data.length === 0)
    return echec(
      error ? error.code : "42501",
      "L'annonce n'a pas pu être modifiée. Réessayez dans un instant.",
    );

  actualiser();
  return {
    ok: true,
    message: epinglee ? "Annonce épinglée." : "Annonce désépinglée.",
  };
}

/** Supprime une annonce, avec les fichiers que plus aucune autre annonce n'utilise. */
export async function supprimerAnnonce(
  id: string,
  titre: string,
): Promise<Resultat> {
  const supabase = await clientSession();
  const { data, error } = await supabase
    .from("annonce")
    .delete()
    .eq("id", id)
    .select("photo_chemin, document_chemin");
  if (error)
    return echec(
      error.code,
      "L'annonce n'a pas pu être supprimée. Réessayez dans un instant.",
    );
  if (data.length === 0)
    return {
      ok: false,
      message:
        "Cette annonce n'existe plus, ou vous n'avez plus le droit de la supprimer.",
    };

  await retirerFichiersOrphelins(supabase, [
    data[0].photo_chemin,
    data[0].document_chemin,
  ]);
  return retourALaListe("supprimee", titre);
}
