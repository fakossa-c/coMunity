"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  verifierSection,
  versSection,
  type SaisieSection,
} from "@/lib/reglement";
import type { Resultat } from "@/lib/resultat";
import { clientSession } from "@/lib/supabase/serveur";

const LISTE = "/syndic/reglement";

const messages: Record<string, string> = {
  "42501": "Seul le conseil syndical peut rédiger le règlement intérieur.",
  "22023": "Cette section a été supprimée entre-temps.",
  "23514": "Un texte est trop long. Raccourcissez-le, puis enregistrez.",
};

function echec(code: string | undefined, parDefaut: string): Resultat {
  return { ok: false, message: messages[code ?? ""] ?? parDefaut };
}

function actualiser() {
  revalidatePath(LISTE);
  revalidatePath("/ma-copro");
}

/** Revient à la liste, qui annonce ce qui vient d'être fait. */
function retourALaListe(
  fait: "ajoutee" | "enregistree" | "supprimee",
  titre: string,
): never {
  actualiser();
  redirect(`${LISTE}?${new URLSearchParams({ fait, titre })}`);
}

/**
 * Ajoute une section au règlement (`id` absent, en dernière place) ou enregistre sa
 * modification. La base ne laisse écrire que le conseil syndical.
 */
export async function enregistrerSection(
  id: string | null,
  saisie: SaisieSection,
): Promise<Resultat> {
  const verdict = verifierSection(saisie);
  if (verdict.erreur) return { ok: false, message: verdict.erreur };

  const section = versSection(saisie);
  const supabase = await clientSession();
  const { data, error } = id
    ? await supabase
        .from("section_reglement")
        .update(section)
        .eq("id", id)
        .select("id")
    : await supabase.from("section_reglement").insert(section).select("id");

  if (error)
    return echec(
      error.code,
      "La section n'a pas pu être enregistrée. Réessayez dans un instant.",
    );
  if (data.length === 0)
    return {
      ok: false,
      message: "Cette section n'existe plus, ou votre accès a été retiré.",
    };

  return retourALaListe(id ? "enregistree" : "ajoutee", section.titre);
}

/** Supprime une section du règlement. */
export async function supprimerSection(
  id: string,
  titre: string,
): Promise<Resultat> {
  const supabase = await clientSession();
  const { data, error } = await supabase
    .from("section_reglement")
    .delete()
    .eq("id", id)
    .select("id");
  if (error)
    return echec(
      error.code,
      "La section n'a pas pu être supprimée. Réessayez dans un instant.",
    );
  if (data.length === 0)
    return {
      ok: false,
      message: "Cette section n'existe plus, ou votre accès a été retiré.",
    };

  return retourALaListe("supprimee", titre);
}

/** Échange une section avec sa voisine du dessus ou du dessous. */
export async function deplacerSection(
  id: string,
  versLeHaut: boolean,
): Promise<Resultat> {
  const supabase = await clientSession();
  const { error } = await supabase.rpc("deplacer_section_reglement", {
    section: id,
    vers_le_haut: versLeHaut,
  });
  if (error)
    return echec(
      error.code,
      "La section n'a pas pu être déplacée. Réessayez dans un instant.",
    );

  actualiser();
  return { ok: true, message: "" };
}
