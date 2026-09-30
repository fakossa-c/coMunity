"use server";

import { revalidatePath } from "next/cache";
import { refusInteret, type CentreInteret } from "@/lib/centres-interet";
import type { Resultat } from "@/lib/resultat";
import { clientSession } from "@/lib/supabase/serveur";

const INTERETS = "/profil/interets";

const NON_CONNECTE = {
  ok: false,
  message: "Connectez-vous pour gérer vos centres d'intérêt.",
};
const DEJA_DECLARE = "Vous avez déjà déclaré ce centre d'intérêt.";

async function personneConnectee() {
  const supabase = await clientSession();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

/** Les centres d'intérêt de la personne connectée, pour repérer un doublon. */
async function mesInterets(
  supabase: Awaited<ReturnType<typeof clientSession>>,
) {
  const { data } = await supabase.from("centre_interet").select("id, libelle");
  return (data ?? []) as CentreInteret[];
}

/** Déclare un centre d'intérêt. */
export async function ajouterInteret(libelle: string): Promise<Resultat> {
  const { supabase, user } = await personneConnectee();
  if (!user) return NON_CONNECTE;
  const saisi = String(libelle).trim();
  const refus = refusInteret(saisi, await mesInterets(supabase));
  if (refus) return { ok: false, message: refus };

  const { error } = await supabase
    .from("centre_interet")
    .insert({ profil_id: user.id, libelle: saisi });
  if (error) {
    return {
      ok: false,
      message:
        error.code === "23505"
          ? DEJA_DECLARE
          : "Le centre d'intérêt n'a pas pu être ajouté. Réessayez dans un instant.",
    };
  }

  revalidatePath(INTERETS);
  return { ok: true, message: `« ${saisi} » est ajouté.` };
}

/** Change le libellé d'un centre d'intérêt de la personne connectée. */
export async function modifierInteret(
  id: string,
  libelle: string,
): Promise<Resultat> {
  const { supabase, user } = await personneConnectee();
  if (!user) return NON_CONNECTE;
  const saisi = String(libelle).trim();
  const refus = refusInteret(saisi, await mesInterets(supabase), id);
  if (refus) return { ok: false, message: refus };

  const { data, error } = await supabase
    .from("centre_interet")
    .update({ libelle: saisi })
    .eq("id", id)
    .select("id");
  if (error) {
    return {
      ok: false,
      message:
        error.code === "23505"
          ? DEJA_DECLARE
          : "Le centre d'intérêt n'a pas pu être modifié. Réessayez dans un instant.",
    };
  }
  if (data.length === 0) {
    return { ok: false, message: "Ce centre d'intérêt n'existe plus." };
  }

  revalidatePath(INTERETS);
  return { ok: true, message: `« ${saisi} » est enregistré.` };
}

/** Retire un centre d'intérêt de la personne connectée. */
export async function supprimerInteret(id: string): Promise<Resultat> {
  const { supabase, user } = await personneConnectee();
  if (!user) return NON_CONNECTE;

  const { data, error } = await supabase
    .from("centre_interet")
    .delete()
    .eq("id", id)
    .select("libelle");
  if (error) {
    return {
      ok: false,
      message:
        "Le centre d'intérêt n'a pas pu être retiré. Réessayez dans un instant.",
    };
  }

  revalidatePath(INTERETS);
  return {
    ok: true,
    message: data[0] ? `« ${data[0].libelle} » est retiré.` : "Déjà retiré.",
  };
}
