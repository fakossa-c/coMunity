import type { EmailOtpType } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";
import { clientSession } from "@/lib/supabase/serveur";

/** Où mène chaque lien une fois la session ouverte, et où il renvoie s'il ne vaut plus rien. */
const destinations: Partial<
  Record<EmailOtpType, { valide: string; invalide: string }>
> = {
  invite: {
    valide: "/nouveau-mot-de-passe",
    invalide: "/connexion?lien=invalide",
  },
  recovery: {
    valide: "/nouveau-mot-de-passe",
    invalide: "/connexion?lien=invalide",
  },
  email_change: {
    valide: "/profil/identifiants?fait=email-confirme",
    invalide: "/profil/identifiants?lien=invalide",
  },
};

/**
 * Lien des emails d'invitation, de mot de passe oublié et de changement d'adresse : ouvre la
 * session de la personne, puis la mène au choix de son mot de passe ou à ses identifiants.
 */
export async function GET(requete: NextRequest) {
  const parametres = requete.nextUrl.searchParams;
  const jeton = parametres.get("token_hash");
  const type = parametres.get("type") as EmailOtpType | null;
  const destination = type ? destinations[type] : undefined;

  if (jeton && type && destination) {
    const supabase = await clientSession();
    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash: jeton,
    });
    redirect(error ? destination.invalide : destination.valide);
  }
  redirect("/connexion?lien=invalide");
}
