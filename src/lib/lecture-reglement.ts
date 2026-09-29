import "server-only";
import type { SectionLue } from "./reglement";
import { clientSession } from "./supabase/serveur";

/**
 * Les sections du règlement intérieur dans l'ordre du règlement, et la date de dernière mise à
 * jour (`null` tant qu'aucune section n'a été écrite). Vide pour un compte qui ne peut pas le lire.
 */
export async function lireReglement(): Promise<{
  sections: SectionLue[];
  misAJourLe: string | null;
}> {
  const supabase = await clientSession();
  const [sections, date] = await Promise.all([
    supabase
      .from("section_reglement")
      .select("id, titre, texte")
      .order("position")
      .order("cree_le")
      .order("id"),
    supabase.from("reglement").select("mis_a_jour_le").maybeSingle(),
  ]);
  if (sections.error)
    throw new Error(`Règlement illisible : ${sections.error.message}`);
  if (date.error)
    throw new Error(`Date du règlement illisible : ${date.error.message}`);
  return {
    sections: sections.data as SectionLue[],
    misAJourLe: date.data?.mis_a_jour_le ?? null,
  };
}
