import "server-only";
import type { Activite } from "@/components/carte-activite";
import { classerMesActivites } from "./mes-activites";
import { aujourdhui } from "./partage-activite";
import { clientSession } from "./supabase/serveur";

/**
 * Les activités du résident connecté, rangées dans les trois segments de l'écran Activités.
 * Trois lectures : les activités à venir du catalogue où il est inscrit, celles qu'il organise
 * (passées, à venir, annulées) et ses inscriptions passées.
 */
export async function lireMesActivites(residentId: string) {
  const supabase = await clientSession();
  const jour = aujourdhui();

  const [catalogue, organisees, passees] = await Promise.all([
    supabase.rpc("catalogue_activites"),
    supabase.rpc("mes_activites_organisees"),
    supabase
      .from("inscription_activite")
      .select(
        "activite!inner(id, identifiant_public, titre, categorie, pictogramme, date_activite, heure_debut, lieu, etiquettes, statut)",
      )
      .eq("resident_id", residentId)
      .lt("activite.date_activite", jour),
  ]);
  if (catalogue.error)
    throw new Error(
      `Vos inscriptions sont illisibles : ${catalogue.error.message}`,
    );
  if (organisees.error)
    throw new Error(
      `Vos activités sont illisibles : ${organisees.error.message}`,
    );
  if (passees.error)
    throw new Error(
      `Vos activités passées sont illisibles : ${passees.error.message}`,
    );

  const inscriptionsAVenir = (catalogue.data as Activite[]).filter(
    (activite) => activite.mes_accompagnants != null,
  );
  const inscriptionsPassees = (
    passees.data as unknown as { activite: Activite }[]
  ).map(({ activite }) => activite);

  return classerMesActivites({
    inscriptions: [...inscriptionsAVenir, ...inscriptionsPassees],
    organisees: organisees.data as Activite[],
    jour,
  });
}
