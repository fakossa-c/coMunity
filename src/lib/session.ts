import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { headers } from "next/headers";
import { userAgent } from "next/server";
import { cache } from "react";
import type { TailleAffichage, ThemeAffichage } from "./attributs-affichage";
import { clientSession, configurationSupabase } from "./supabase/serveur";

export type Role = "syndic" | "resident";
export type StatutCompte = "en_attente" | "valide" | "refuse" | "retire";

export type Session = {
  id: string;
  email: string;
  /** `null` : compte sans profil, qui n'a accès à rien. */
  role: Role | null;
  statut: StatutCompte | null;
  /** `null` pour un membre du syndic qui ne les a pas encore saisis. */
  prenom: string | null;
  nom: string | null;
  taille: TailleAffichage;
  theme: ThemeAffichage;
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
    .select("role, statut, prenom, nom, taille, theme")
    .eq("id", claims.sub)
    .maybeSingle();
  return {
    id: claims.sub,
    email: claims.email ?? "",
    role: profil?.role ?? null,
    statut: profil?.statut ?? null,
    prenom: profil?.prenom ?? null,
    nom: profil?.nom ?? null,
    taille: profil?.taille ?? "standard",
    theme: profil?.theme ?? "clair",
  };
});

type Profil = Pick<Session, "role" | "statut">;
type ProfilNomme = Pick<Session, "role" | "statut" | "prenom" | "nom">;

/** Rôle, statut et nom d'un compte, tels que la personne connectée a le droit de les lire. */
export async function lireProfil(
  supabase: SupabaseClient,
  id: string,
): Promise<ProfilNomme | null> {
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

/** Vrai pour un membre du syndic qui n'a pas encore saisi son prénom et son nom. */
export function doitCompleterProfil(profil: ProfilNomme | null) {
  return estSyndicActif(profil) && !(profil?.prenom && profil.nom);
}

/**
 * Où envoyer une personne qui vient de se connecter ou de choisir son mot de passe : la page
 * qu'elle demandait, sinon l'espace syndic pour un membre du syndic sur ordinateur, l'accueil
 * pour les autres. Un membre du syndic sans prénom ni nom passe d'abord par l'écran qui les demande.
 */
export async function accueilDe(
  profil: ProfilNomme | null,
  suivant?: string | null,
) {
  const destination =
    suivant ??
    (estSyndicActif(profil) && !(await surMobile()) ? "/syndic" : "/");
  return doitCompleterProfil(profil)
    ? `${CHEMIN_COMPLETION}?suivant=${encodeURIComponent(destination)}`
    : destination;
}

/** L'écran où un membre du syndic saisit son prénom et son nom avant d'aller plus loin. */
export const CHEMIN_COMPLETION = "/completer-profil";

async function surMobile() {
  return userAgent({ headers: await headers() }).device.type === "mobile";
}
