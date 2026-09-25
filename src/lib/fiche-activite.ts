import "server-only";
import { headers } from "next/headers";
import { cache } from "react";
import type { CategorieActivite } from "./categories-activite";
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
  proposee_par_syndic: boolean;
  /** `null` pour un visiteur : il ne lit aucun nom. */
  organisateur_prenom: string | null;
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

/** L'origine sous laquelle la personne voit l'app : les liens partagés la reprennent. */
export async function origine() {
  const entetes = await headers();
  const hote = entetes.get("x-forwarded-host") ?? entetes.get("host");
  const local = /^(localhost|127\.0\.0\.1)(:|$)/.test(hote ?? "");
  const protocole =
    entetes.get("x-forwarded-proto") ?? (local ? "http" : "https");
  return `${protocole}://${hote}`;
}

/** Le lien public de la fiche, celui qu'on colle dans le groupe WhatsApp. */
export async function lienFiche(identifiant: string) {
  return `${await origine()}/activites/${identifiant}`;
}
