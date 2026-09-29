import "server-only";
import { headers } from "next/headers";
import { cache } from "react";
import type { StatutActivite } from "@/components/etat-activite";
import type { CategorieActivite } from "./categories-activite";
import type { EtiquetteActivite } from "./etiquettes-activite";
import { origineDe } from "./origine";
import { cheminFiche } from "./partage-activite";
import { urlPhoto } from "./photos-activite";
import { clientSession, configurationSupabase } from "./supabase/serveur";

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
  /** `null` : pas de limite de participants. */
  capacite_max: number | null;
  /** Accompagnants compris. */
  places_prises: number;
  /** Accompagnants de la personne connectée ; `null` si elle n'est pas inscrite. */
  mes_accompagnants: number | null;
  /** `null` : pas de minimum de participants. */
  capacite_min: number | null;
  etiquettes: EtiquetteActivite[];
  mot_accueil: string | null;
  conseils_pratiques: string | null;
  materiel_prevoir: string | null;
  a_apporter: string | null;
  precision_acces: string | null;
  /**
   * `annulee` : annulée, elle reste visible de ses inscrits. `en_relecture` ou `masquee` : la
   * fiche n'est livrée qu'à son créateur et au conseil syndical.
   */
  statut: StatutActivite;
  /** Note du retour déjà laissé par la personne connectée ; `null` si elle n'en a pas laissé. */
  mon_retour_note: number | null;
  mon_retour_commentaire: string | null;
  /** `null` : lieu libre, ou espace commun supprimé depuis. */
  espace_commun_id: string | null;
  /** Les consignes de l'espace commun où se tient l'activité ; `null` sans espace ou sans consigne. */
  consignes_espace: string | null;
  /** Chemins des photos dans le bucket `activites`, dans l'ordre ; vide sans photo. */
  photos: string[];
  /** Le message de la dernière décision du conseil syndical, lu par le créateur et le conseil syndical ; `null` sans message. */
  message_moderation: string | null;
  /** Pourquoi l'activité a été mise en relecture, lu par le conseil syndical seul. */
  raison_relecture: string | null;
};

/** L'adresse publique d'une photo du bucket `activites`. */
export function adressePhoto(chemin: string) {
  const configuration = configurationSupabase();
  if (!configuration) throw new Error("Supabase n'est pas configuré.");
  return urlPhoto(configuration.url, chemin);
}

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
