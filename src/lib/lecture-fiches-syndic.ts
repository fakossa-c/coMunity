import "server-only";
import {
  BUCKET_SYNDIC,
  type CompteRelie,
  type FicheSyndic,
} from "./fiche-syndic";
import { nomComplet } from "./nom-complet";
import { clientSession } from "./supabase/serveur";

/** Une fiche et l'adresse signée de sa photo (`null` sans photo). */
export type FicheAvecPhoto = FicheSyndic & { photo_url: string | null };

/** Durée de validité de l'adresse d'une photo, en secondes : la durée d'une lecture de la page. */
const VALIDITE_PHOTO = 60 * 60;

/**
 * Les fiches de Mon syndic dans leur ordre, avec l'adresse signée de leur photo (le bucket est
 * privé). Vide pour un compte qui ne peut pas les lire.
 */
export async function lireFichesSyndic(): Promise<FicheAvecPhoto[]> {
  const supabase = await clientSession();
  const { data, error } = await supabase.rpc("lister_fiches_syndic");
  if (error) throw new Error(`Mon syndic illisible : ${error.message}`);
  const fiches = data as FicheSyndic[];

  const chemins = fiches.flatMap((f) =>
    f.photo_chemin ? [f.photo_chemin] : [],
  );
  const adresses = new Map<string, string>();
  if (chemins.length > 0) {
    const { data: signees } = await supabase.storage
      .from(BUCKET_SYNDIC)
      .createSignedUrls(chemins, VALIDITE_PHOTO);
    // Une photo qu'on ne sait pas signer laisse l'initiale à sa place.
    for (const { path, signedUrl } of signees ?? [])
      if (path && signedUrl) adresses.set(path, signedUrl);
  }
  return fiches.map((f) => ({
    ...f,
    photo_url: (f.photo_chemin && adresses.get(f.photo_chemin)) || null,
  }));
}

/**
 * Les comptes de l'espace syndic encore actifs qui n'ont pas de fiche, plus `dejaRelie` (celui de
 * la fiche qu'on modifie), même si son accès a été retiré depuis : le choix reste ainsi fidèle à la
 * fiche, et l'enregistrer ne change pas le lien. Lue par le conseil syndical.
 */
export async function lireComptesReliables(
  dejaRelie: string | null = null,
): Promise<CompteRelie[]> {
  const supabase = await clientSession();
  const [comptes, fiches] = await Promise.all([
    supabase
      .from("profil")
      .select("id, email, prenom, nom, statut")
      .eq("role", "syndic")
      .order("email"),
    supabase
      .from("fiche_syndic")
      .select("compte_id")
      .not("compte_id", "is", null),
  ]);
  if (comptes.error)
    throw new Error(`Comptes illisibles : ${comptes.error.message}`);
  if (fiches.error)
    throw new Error(`Fiches illisibles : ${fiches.error.message}`);
  const pris = new Set(fiches.data.map((f) => f.compte_id));
  return comptes.data
    .filter(
      (c) => c.id === dejaRelie || (c.statut === "valide" && !pris.has(c.id)),
    )
    .map((c) => {
      const libelle =
        c.prenom && c.nom
          ? `${nomComplet({ prenom: c.prenom, nom: c.nom })} (${c.email})`
          : c.email;
      return {
        id: c.id,
        libelle: c.statut === "valide" ? libelle : `${libelle}, accès retiré`,
      };
    });
}
