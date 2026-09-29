import { createClient } from "@supabase/supabase-js";

/**
 * Client du navigateur, sans session : il ne sert qu'à envoyer un fichier avec le jeton à usage
 * unique que le serveur vient de donner après avoir vérifié les droits.
 */
export function clientNavigateur() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const cle = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !cle) throw new Error("Supabase n'est pas configuré.");
  return createClient(url, cle, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
