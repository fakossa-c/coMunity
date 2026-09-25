import "server-only";
import { headers } from "next/headers";
import { cache } from "react";
import type { CategorieActivite } from "./categories-activite";
import { origineDe } from "./origine";
import { cheminFiche } from "./partage-activite";
import { clientSession } from "./supabase/serveur";

/** Ce que la fonction `fiche_activite` livre d'une activité, visiteurs compris. */
export type FicheActivite = {
  identifiant_public: string;
  titre: string;
  categorie: CategorieActivite;
  pictogramme: string;
  description: string | null;
  date_activite: string;
  heure_debut: string;
  heure_fin: string;
  lieu: string;
  /** Su de la base, pas affiché : une activité du syndic se présente comme celle d'un voisin. */
  proposee_par_syndic: boolean;
  /** « Danielle M. » ; `null` pour un visiteur, qui ne lit aucun nom. */
  organisateur_nom_affiche: string | null;
  est_organisateur: boolean;
};

/** La fiche d'une activité par son identifiant public, lue une fois par requête. `null` si elle n'existe pas. */
export const lireFiche = cache(
  async (identifiant: string): Promise<FicheActivite | null> => {
    const supabase = await clientSession();
    const { data, error } = await supabase
      .rpc("fiche_activite", { identifiant })
      .maybeSingle<FicheActivite>();
    if (error) throw new Error(`Fiche d'activité illisible : ${error.message}`);
    return data;
  },
);

/** L'origine des liens partagés, pour la requête en cours. */
export async function origine() {
  const entetes = await headers();
  return origineDe(
    {
      hote: entetes.get("x-forwarded-host") ?? entetes.get("host"),
      protocole: entetes.get("x-forwarded-proto"),
    },
    {
      VERCEL_ENV: process.env.VERCEL_ENV,
      VERCEL_PROJECT_PRODUCTION_URL: process.env.VERCEL_PROJECT_PRODUCTION_URL,
    },
  );
}

/** Le lien public de la fiche, celui qu'on colle dans le groupe WhatsApp. */
export async function lienFiche(identifiant: string) {
  return `${await origine()}${cheminFiche(identifiant)}`;
}
