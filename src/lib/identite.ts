import { nomComplet } from "./nom-complet";

type Personne = { prenom: string | null; nom: string | null; email: string };

/**
 * Ce que l'avatar et le menu du profil affichent de la personne connectée. Un membre du syndic
 * amorcé n'a ni prénom ni nom : son email en tient lieu.
 */
export function identite({ prenom, nom, email }: Personne) {
  const libelle =
    prenom && nom ? nomComplet({ prenom, nom }) : (prenom ?? email);
  return { initiale: libelle.charAt(0).toUpperCase(), nom: libelle };
}
