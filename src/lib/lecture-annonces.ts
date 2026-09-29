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
