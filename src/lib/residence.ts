import "server-only";
import { createClient } from "@supabase/supabase-js";
import { connection } from "next/server";
import { cache } from "react";

export type Residence = { nom: string; logo: string | null };

/**
 * Lit la résidence servie par cette instance, à chaque requête.
 * Renvoie `null` si Supabase n'est pas configuré ou ne répond pas :
 * l'app s'affiche quand même, sans le nom de la résidence.
 * Mémorisée le temps d'une requête : l'en-tête et les métadonnées la lisent tous deux.
 */
export const lireResidence = cache(async (): Promise<Residence | null> => {
  await connection();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const cle = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !cle) return null;

  const supabase = createClient(url, cle, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await supabase
    .from("residence")
    .select("nom, logo")
    .maybeSingle();
  if (error) {
    console.error("Lecture de la résidence impossible :", error.message);
    return null;
  }
  return data;
});
