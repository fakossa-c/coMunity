import type { EmailOtpType } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";
import { clientSession } from "@/lib/supabase/serveur";

const typesAcceptes: EmailOtpType[] = ["invite", "recovery"];

/**
 * Lien des emails d'invitation et de mot de passe oublié : ouvre la session de la personne,
 * puis la mène au choix de son mot de passe.
 */
export async function GET(requete: NextRequest) {
  const parametres = requete.nextUrl.searchParams;
  const jeton = parametres.get("token_hash");
  const type = parametres.get("type") as EmailOtpType | null;

  if (jeton && type && typesAcceptes.includes(type)) {
    const supabase = await clientSession();
    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash: jeton,
    });
    if (!error) redirect("/nouveau-mot-de-passe");
  }
  redirect("/connexion?lien=invalide");
}
