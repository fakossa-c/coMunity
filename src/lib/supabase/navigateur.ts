/**
 * Client du navigateur, sans session : il ne sert qu'à envoyer un fichier avec le jeton à usage
 * unique que le serveur vient de donner après avoir vérifié les droits. Il se charge à la demande,
 * au moment de l'envoi : un écran qui ne fait qu'afficher un formulaire n'embarque pas
 * `@supabase/supabase-js`.
 */
export async function clientNavigateur() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const cle = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !cle) throw new Error("Supabase n'est pas configuré.");
  const { createClient } = await import("@supabase/supabase-js");
  return createClient(url, cle, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
