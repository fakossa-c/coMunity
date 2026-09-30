import type { PageArrivee } from "./attributs-affichage";
import type { Role, StatutCompte } from "./session";

export type ProfilArrivee = {
  role: Role | null;
  statut: StatutCompte | null;
  prenom: string | null;
  nom: string | null;
  pageArrivee: PageArrivee;
};

export function destinationArrivee(
  _profil: ProfilArrivee | null,
  _suivant?: string | null,
): string {
  throw new Error("À écrire");
}
