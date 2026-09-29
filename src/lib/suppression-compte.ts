import type { SupabaseClient } from "@supabase/supabase-js";

/** Retire du bucket `activites` les dossiers des activités désignées. */
export async function retirerPhotosDesActivites(
  _client: SupabaseClient,
  _activites: string[],
) {}
