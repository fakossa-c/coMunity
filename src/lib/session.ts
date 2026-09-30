import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { cache } from "react";
import type {
  PageArrivee,
  TailleAffichage,
  ThemeAffichage,
} from "./attributs-affichage";
import { destinationArrivee, lireAvecPageArrivee } from "./page-arrivee";
import { clientSession, configurationSupabase } from "./supabase/serveur";

export {
  doitCompleterProfil,
  estSyndicActif,
  estSyndicRetire,
  statutResident,
} from "./profil";
export { CHEMIN_COMPLETION } from "./page-arrivee";

export type Role = "syndic" | "resident";
export type StatutCompte = "en_attente" | "valide" | "refuse" | "retire";

export type Session = {
  id: string;
  email: string;
  /** `null` : compte sans profil, qui n'a accès à rien. */
  role: Role | null;
  statut: StatutCompte | null;
  /** Le nom que les voisins lisent ; `null` pour un membre du syndic qui n'a pas encore saisi son prénom et son nom. */
  pseudo: string | null;
  /** `null` pour un membre du syndic qui ne les a pas encore saisis. */
  prenom: string | null;
  nom: string | null;
  taille: TailleAffichage;
  theme: ThemeAffichage;
  /** Sans effet pour un compte qui n'est pas membre actif du conseil syndical. */
  pageArrivee: PageArrivee;
};

/** La personne connectée et son profil, lus une fois par requête. `null` si personne n'est connecté. */
export const lireSession = cache(async (): Promise<Session | null> => {
  if (!configurationSupabase()) return null;

  const supabase = await clientSession();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims) return null;

  const profil = await lireAvecPageArrivee<
    Omit<Session, "id" | "email" | "pageArrivee">
  >(
    (colonnes) =>
      supabase
        .from("profil")
        .select(colonnes)
        .eq("id", claims.sub)
        .maybeSingle(),
    "role, statut, pseudo, prenom, nom, taille, theme",
  );
  return {
    id: claims.sub,
    email: claims.email ?? "",
    role: profil?.role ?? null,
    statut: profil?.statut ?? null,
    pseudo: profil?.pseudo ?? null,
    prenom: profil?.prenom ?? null,
    nom: profil?.nom ?? null,
    taille: profil?.taille ?? "standard",
    theme: profil?.theme ?? "clair",
    pageArrivee: profil?.pageArrivee ?? "tableau_de_bord",
  };
});

type ProfilNomme = Pick<
  Session,
  "role" | "statut" | "prenom" | "nom" | "pageArrivee"
>;

/** Rôle, statut, nom et page d'arrivée d'un compte, tels que la personne connectée a le droit de les lire. */
export async function lireProfil(
  supabase: SupabaseClient,
  id: string,
): Promise<ProfilNomme | null> {
  return lireAvecPageArrivee<Omit<ProfilNomme, "pageArrivee">>(
    (colonnes) =>
      supabase.from("profil").select(colonnes).eq("id", id).maybeSingle(),
    "role, statut, prenom, nom",
  );
}

/**
 * Où envoyer une personne qui vient de se connecter, de choisir son mot de passe ou de se
 * présenter : voir `destinationArrivee`.
 */
export async function accueilDe(
  profil: ProfilNomme | null,
  suivant?: string | null,
) {
  return destinationArrivee(profil, suivant);
}
