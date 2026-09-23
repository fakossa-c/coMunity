import { createClient } from "@supabase/supabase-js";
import { inject } from "vitest";

/** Un client sans session : ce que voit une personne qui ouvre un lien sans être connectée. */
export function clientVisiteur() {
  const { url, cleAnonyme } = inject("supabase");
  return createClient(url, cleAnonyme, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
