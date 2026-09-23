import "server-only";
import { cache } from "react";
import { clientSession, configurationSupabase } from "./supabase/serveur";

export type Role = "syndic" | "resident";
export type StatutCompte = "en_attente" | "valide" | "refuse" | "retire";

export type Session = {
  id: string;
  email: string;
  /** `null` : compte sans profil, qui n'a accès à rien. */
  role: Role | null;
  statut: StatutCompte | null;
};

/** La personne connectée et son profil, lus une fois par requête. `null` si personne n'est connecté. */
export const lireSession = cache(async (): Promise<Session | null> => {
  if (!configurationSupabase()) return null;

  const supabase = await clientSession();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims) return null;

  const { data: profil } = await supabase
    .from("profil")
    .select("role, statut")
    .eq("id", claims.sub)
    .maybeSingle();

  return {
    id: claims.sub,
    email: claims.email ?? "",
    role: profil?.role ?? null,
    statut: profil?.statut ?? null,
  };
});

type Profil = Pick<Session, "role" | "statut">;

export function estSyndicActif(profil: Profil | null) {
  return profil?.role === "syndic" && profil.statut === "valide";
}

/** Où envoyer une personne qui vient de se connecter ou de choisir son mot de passe. */
export function accueilDe(profil: Profil | null) {
  return estSyndicActif(profil) ? "/syndic" : "/";
}
