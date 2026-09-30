import type { PageArrivee } from "./attributs-affichage";
import { doitCompleterProfil, estSyndicActif } from "./profil";
import type { Role, StatutCompte } from "./session";

export type ProfilArrivee = {
  role: Role | null;
  statut: StatutCompte | null;
  prenom: string | null;
  nom: string | null;
  pageArrivee: PageArrivee;
};

/** L'écran où un membre du syndic saisit son prénom et son nom avant d'aller plus loin. */
export const CHEMIN_COMPLETION = "/completer-profil";

const CHEMINS: Record<PageArrivee, string> = {
  tableau_de_bord: "/syndic/tableau-de-bord",
  accueil: "/",
};

/**
 * Où envoyer une personne qui vient de se connecter, de choisir son mot de passe ou de se
 * présenter : la page qu'elle demandait, sinon la page d'arrivée choisie dans Mes réglages pour
 * un membre actif du conseil syndical, l'Accueil pour tout autre compte. Un membre du conseil
 * syndical sans prénom ni nom passe d'abord par l'écran qui les demande.
 */
export function destinationArrivee(
  profil: ProfilArrivee | null,
  suivant?: string | null,
) {
  const page =
    profil && estSyndicActif(profil) ? profil.pageArrivee : "accueil";
  const destination = suivant ?? CHEMINS[page];
  return doitCompleterProfil(profil)
    ? `${CHEMIN_COMPLETION}?suivant=${encodeURIComponent(destination)}`
    : destination;
}
