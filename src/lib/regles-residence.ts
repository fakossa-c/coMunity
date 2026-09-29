import "server-only";
import type { ReglesResidence } from "@/assistant";
import { BUCKET_PHOTOS_ESPACES } from "./photo-espace-commun";
import {
  COLONNES_ESPACE,
  reglesResidence,
  type EspaceCommun,
  type OccupationEspace,
} from "./espaces-communs";
import { clientSession } from "./supabase/serveur";

/** Les espaces communs de la résidence, par nom. Vide pour un compte qui ne peut pas les lire. */
export async function lireEspacesCommuns(): Promise<EspaceCommun[]> {
  const supabase = await clientSession();
  const { data, error } = await supabase
    .from("espace_commun")
    .select(COLONNES_ESPACE)
    .order("nom");
  if (error) throw new Error(`Espaces communs illisibles : ${error.message}`);
  return data as EspaceCommun[];
}

/** Durée de validité de l'adresse d'une photo : le temps de lire la page, une heure de marge. */
const VALIDITE_PHOTO_SECONDES = 60 * 60;

/**
 * L'adresse signée de la photo de chaque espace commun qui en a une, par identifiant d'espace.
 * Le bucket est privé : la base ne signe que pour un compte qui peut lire les espaces communs.
 * Une photo dont l'adresse n'a pas pu être signée manque simplement : la carte s'affiche sans.
 */
export async function lireUrlsPhotosEspaces(
  espaces: EspaceCommun[],
): Promise<Record<string, string>> {
  const avecPhoto = espaces.filter(
    (e): e is EspaceCommun & { photo_chemin: string } =>
      e.photo_chemin !== null,
  );
  if (avecPhoto.length === 0) return {};

  const supabase = await clientSession();
  const { data } = await supabase.storage
    .from(BUCKET_PHOTOS_ESPACES)
    .createSignedUrls(
      avecPhoto.map((e) => e.photo_chemin),
      VALIDITE_PHOTO_SECONDES,
    );
  const urls: Record<string, string> = {};
  for (const [i, espace] of avecPhoto.entries()) {
    const signee = data?.[i];
    if (signee?.signedUrl) urls[espace.id] = signee.signedUrl;
  }
  return urls;
}

/** L'heure de calme de la résidence (« 22:00:00 »), ou `null` si la résidence n'en a pas. */
export async function lireHeureCalme(): Promise<string | null> {
  const supabase = await clientSession();
  const { data, error } = await supabase
    .from("residence")
    .select("heure_calme")
    .maybeSingle();
  if (error) throw new Error(`Résidence illisible : ${error.message}`);
  return data?.heure_calme ?? null;
}

/**
 * Ce qu'il faut au parcours de création : les espaces communs à proposer et les règles que
 * l'assistant applique. `identifiantExclu` : l'activité qu'on modifie, qui n'occupe pas son
 * propre créneau.
 */
export async function lireContexteParcours(identifiantExclu?: string): Promise<{
  espaces: EspaceCommun[];
  regles: ReglesResidence;
}> {
  const supabase = await clientSession();
  let occupations = supabase
    .from("activite")
    .select("titre, espace_commun_id, date_activite, heure_debut, heure_fin")
    .not("espace_commun_id", "is", null)
    .eq("statut", "publiee")
    .gte("date_activite", new Date().toISOString().slice(0, 10));
  if (identifiantExclu)
    occupations = occupations.neq("identifiant_public", identifiantExclu);

  const [espaces, heureCalme, { data, error }] = await Promise.all([
    lireEspacesCommuns(),
    lireHeureCalme(),
    occupations,
  ]);
  if (error) throw new Error(`Activités illisibles : ${error.message}`);

  return {
    espaces,
    regles: reglesResidence({
      heureCalme,
      espaces,
      occupations: data as OccupationEspace[],
    }),
  };
}
