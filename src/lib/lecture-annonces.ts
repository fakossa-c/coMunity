import "server-only";
import { cache } from "react";
import {
  BUCKET_ANNONCES,
  COLONNES_ANNONCE,
  cheminAnnonce,
  typesDuFiltre,
  type Annonce,
  type FicheAnnonce,
  type FiltreAnnonce,
} from "./annonces";
import { origine } from "./fiche-activite";
import { COLONNES_SONDAGE, type Sondage } from "./sondages";
import { clientSession, configurationSupabase } from "./supabase/serveur";

/**
 * Les annonces de la liste principale que `filtre` garde : celles qui n'ont pas expiré, les
 * épinglées d'abord, puis les plus récentes. Vide pour un compte qui ne peut pas les lire.
 */
export async function lireAnnoncesDuMoment(
  filtre: FiltreAnnonce,
): Promise<Annonce[]> {
  const supabase = await clientSession();
  const types = typesDuFiltre(filtre);
  const requete = supabase.rpc("annonces_du_moment");
  const { data, error } = await (types ? requete.in("type", types) : requete);
  if (error) throw new Error(`Annonces illisibles : ${error.message}`);
  return data as Annonce[];
}

/** Toutes les annonces, expirées comprises, pour le conseil syndical qui les gère. */
export async function lireToutesLesAnnonces(): Promise<Annonce[]> {
  const supabase = await clientSession();
  const { data, error } = await supabase
    .from("annonce")
    .select(COLONNES_ANNONCE)
    .order("epinglee", { ascending: false })
    .order("publiee_le", { ascending: false });
  if (error) throw new Error(`Annonces illisibles : ${error.message}`);
  return data as Annonce[];
}

/** Une annonce par son identifiant interne, pour la modifier ou la dupliquer. `null` si elle n'existe pas. */
export async function lireAnnonce(id: string): Promise<Annonce | null> {
  // Un identifiant qui n'est pas un UUID ne mène à aucune annonce : la base le refuserait en erreur.
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(id)
  )
    return null;
  const supabase = await clientSession();
  const { data, error } = await supabase
    .from("annonce")
    .select(COLONNES_ANNONCE)
    .eq("id", id)
    .maybeSingle<Annonce>();
  if (error) throw new Error(`Annonce illisible : ${error.message}`);
  return data;
}

/** L'annonce d'un lien public, lue une fois par requête. `null` si le lien ne mène à rien. */
export const lireFicheAnnonce = cache(
  async (identifiant: string): Promise<FicheAnnonce | null> => {
    const supabase = await clientSession();
    const { data, error } = await supabase
      .rpc("fiche_annonce", { identifiant })
      .maybeSingle<FicheAnnonce>();
    if (error) throw new Error(`Annonce illisible : ${error.message}`);
    return data;
  },
);

/** Le lien public d'une annonce, celui qu'on colle dans le groupe WhatsApp. */
export async function lienAnnonce(identifiant: string) {
  return `${await origine()}${cheminAnnonce(identifiant)}`;
}

/** L'adresse publique d'un fichier du bucket `annonces`. */
export function urlFichierAnnonce(chemin: string) {
  const configuration = configurationSupabase();
  if (!configuration) throw new Error("Supabase n'est pas configuré.");
  return `${configuration.url}/storage/v1/object/public/${BUCKET_ANNONCES}/${chemin}`;
}

/** Un sondage tel que la personne connectée peut le lire : son choix et, si la base les livre, les votes. */
export type SondageLu = {
  sondage: Sondage;
  /** Rang de l'option choisie, à partir de 1 ; `null` sans réponse. */
  choix: number | null;
  /** Les votes de chaque option, dans l'ordre ; `null` tant que la personne ne peut pas les lire. */
  votes: number[] | null;
};

/** Les sondages des annonces demandées, par identifiant d'annonce. Vide sans annonce à lire. */
export async function lireSondages(
  idsAnnonces: string[],
): Promise<Map<string, SondageLu>> {
  const lus = new Map<string, SondageLu>();
  if (idsAnnonces.length === 0) return lus;

  const supabase = await clientSession();
  const { data, error } = await supabase
    .from("sondage")
    .select(COLONNES_SONDAGE)
    .in("annonce_id", idsAnnonces);
  if (error) throw new Error(`Sondages illisibles : ${error.message}`);
  const sondages = data as (Sondage & { annonce_id: string })[];
  if (sondages.length === 0) return lus;

  const ids = sondages.map((s) => s.id);
  const [reponses, resultats] = await Promise.all([
    supabase
      .from("reponse_sondage")
      .select("sondage_id, choix")
      .in("sondage_id", ids),
    supabase.rpc("resultats_sondages", { p_sondages: ids }),
  ]);
  if (reponses.error)
    throw new Error(`Réponses illisibles : ${reponses.error.message}`);
  if (resultats.error)
    throw new Error(`Résultats illisibles : ${resultats.error.message}`);

  const choixParSondage = new Map(
    (reponses.data as { sondage_id: string; choix: number }[]).map((r) => [
      r.sondage_id,
      r.choix,
    ]),
  );
  const votesParSondage = new Map<string, number[]>();
  for (const ligne of resultats.data as {
    sondage_id: string;
    choix: number;
    votes: number;
  }[]) {
    const votes = votesParSondage.get(ligne.sondage_id) ?? [];
    votes[ligne.choix - 1] = ligne.votes;
    votesParSondage.set(ligne.sondage_id, votes);
  }

  for (const { annonce_id, ...sondage } of sondages)
    lus.set(annonce_id, {
      sondage,
      choix: choixParSondage.get(sondage.id) ?? null,
      votes: votesParSondage.get(sondage.id) ?? null,
    });
  return lus;
}

/** Le sondage d'une annonce, pour la modifier ou la dupliquer. `null` si elle n'en a pas. */
export async function lireSondageDeLAnnonce(
  idAnnonce: string,
): Promise<Sondage | null> {
  const supabase = await clientSession();
  const { data, error } = await supabase
    .from("sondage")
    .select(COLONNES_SONDAGE)
    .eq("annonce_id", idAnnonce)
    .maybeSingle<Sondage>();
  if (error) throw new Error(`Sondage illisible : ${error.message}`);
  return data;
}
