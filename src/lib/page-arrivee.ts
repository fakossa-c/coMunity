import { doitCompleterProfil, estSyndicActif } from "./profil";
import type { Role, StatutCompte } from "./session";

/** La page où arrive un membre du conseil syndical après la connexion, choisie dans Mes réglages. */
export type PageArrivee = "tableau_de_bord" | "accueil";

/** La valeur de la colonne en base, et celle d'un profil lu sur une base qui ne l'a pas encore. */
export const PAGE_ARRIVEE_PAR_DEFAUT: PageArrivee = "tableau_de_bord";

/** Ce que la destination après connexion lit du profil. */
export type ProfilArrivee = {
  role: Role | null;
  statut: StatutCompte | null;
  prenom: string | null;
  nom: string | null;
  pageArrivee: PageArrivee;
};

/** L'écran où un membre du conseil syndical saisit son prénom et son nom avant d'aller plus loin. */
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

/** L'erreur Postgres qu'on reçoit en lisant une colonne qui n'existe pas. */
const COLONNE_ABSENTE = "42703";

/**
 * Lit `colonnes` d'un profil avec sa page d'arrivée. La migration de la colonne est retenue
 * jusqu'à la fusion de `develop` vers `main` (issue #123) : une base qui ne l'a pas encore est
 * relue sans elle, et le profil compte alors la valeur par défaut.
 */
export async function lireAvecPageArrivee<T extends object>(
  lire: (colonnes: string) => PromiseLike<{
    data: T | null;
    error: { code: string } | null;
  }>,
  colonnes: string,
): Promise<(T & { pageArrivee: PageArrivee }) | null> {
  let lecture = await lire(`${colonnes}, page_arrivee`);
  if (lecture.error?.code === COLONNE_ABSENTE) lecture = await lire(colonnes);
  if (!lecture.data) return null;

  const { page_arrivee, ...profil } = lecture.data as T & {
    page_arrivee?: PageArrivee;
  };
  return {
    ...(profil as T),
    pageArrivee: page_arrivee ?? PAGE_ARRIVEE_PAR_DEFAUT,
  };
}
