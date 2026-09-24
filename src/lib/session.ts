import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
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
  /** `null` pour un membre du syndic amorcé, qui ne les a pas saisis. */
  prenom: string | null;
  nom: string | null;
};

/** La personne connectée et son profil, lus une fois par requête. `null` si personne n'est connecté. */
export const lireSession = cache(async (): Promise<Session | null> => {
  if (!configurationSupabase()) return null;

  const supabase = await clientSession();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims) return null;

  const profil = await lireProfil(supabase, claims.sub);
  return {
    id: claims.sub,
    email: claims.email ?? "",
    role: profil?.role ?? null,
    statut: profil?.statut ?? null,
    prenom: profil?.prenom ?? null,
    nom: profil?.nom ?? null,
  };
});

type Profil = Pick<Session, "role" | "statut">;

/** Rôle, statut et nom d'un compte, tels que la personne connectée a le droit de les lire. */
export async function lireProfil(
  supabase: SupabaseClient,
  id: string,
): Promise<Pick<Session, "role" | "statut" | "prenom" | "nom"> | null> {
  const { data } = await supabase
    .from("profil")
    .select("role, statut, prenom, nom")
    .eq("id", id)
    .maybeSingle();
  return data;
}

export function estSyndicActif(profil: Profil | null) {
  return profil?.role === "syndic" && profil.statut === "valide";
}

export function estSyndicRetire(profil: Profil | null) {
  return profil?.role === "syndic" && profil.statut === "retire";
}

/** Statut d'un compte résident ; `null` pour un membre du syndic ou un compte sans profil. */
export function statutResident(profil: Profil | null) {
  return profil?.role === "resident" ? profil.statut : null;
}

/** Où envoyer une personne qui vient de se connecter ou de choisir son mot de passe. */
export function accueilDe(profil: Profil | null) {
  return estSyndicActif(profil) ? "/syndic" : "/";
}
