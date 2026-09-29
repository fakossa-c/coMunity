type Personne = {
  pseudo: string | null;
  prenom: string | null;
  email: string;
};

/**
 * Ce que l'avatar et le menu du profil affichent de la personne connectée : son pseudo. Un membre
 * du syndic qui n'a pas encore de pseudo (prénom et nom non saisis) est représenté par son email.
 */
export function identite({ pseudo, prenom, email }: Personne) {
  const libelle = pseudo ?? prenom ?? email;
  return { initiale: libelle.charAt(0).toUpperCase(), nom: libelle };
}
