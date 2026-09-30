import type { Role, StatutCompte } from "./session";

type Profil = { role: Role | null; statut: StatutCompte | null };
type ProfilNomme = Profil & { prenom: string | null; nom: string | null };

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
