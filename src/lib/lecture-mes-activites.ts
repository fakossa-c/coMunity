import "server-only";
import type { ActiviteDuJour } from "@/components/carte-activite";
import { classerMesActivites } from "./mes-activites";
import { aujourdhui } from "./partage-activite";
import { clientSession } from "./supabase/serveur";

/**
 * Les activités du résident connecté, rangées dans les trois segments de l'écran Activités.
 * Trois lectures : les activités à venir du catalogue où il est inscrit, celles qu'il organise
 * (passées, à venir, annulées) et ses inscriptions passées, celles du jour même comprises : une
 * activité du jour terminée n'est plus au catalogue, mais elle est archivée. Le classement les
 * départage d'après l'heure de fin. Une quatrième, `mes_retours`, donne la note des avis déjà
 * laissés : la table des retours est fermée, la liste ne peut pas la lire ligne à ligne.
 */
export async function lireMesActivites(residentId: string) {
  const supabase = await clientSession();
  const maintenant = new Date();
  const jour = aujourdhui(maintenant);

  const [catalogue, organisees, passees, retours] = await Promise.all([
    supabase.rpc("catalogue_activites"),
    supabase.rpc("mes_activites_organisees"),
    supabase
      .from("inscription_activite")
      .select(
        "activite!inner(id, identifiant_public, titre, categorie, pictogramme, date_activite, heure_debut, heure_fin, lieu, etiquettes, statut)",
      )
      .eq("resident_id", residentId)
      .lte("activite.date_activite", jour),
    supabase.rpc("mes_retours"),
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
  if (retours.error)
    throw new Error(`Vos avis sont illisibles : ${retours.error.message}`);

  const inscriptionsAVenir = (catalogue.data as ActiviteDuJour[]).filter(
    (activite) => activite.mes_accompagnants != null,
  );
  const inscriptionsPassees = (
    passees.data as unknown as { activite: ActiviteDuJour }[]
  ).map(({ activite }) => activite);

  // Une activité du jour est dans les deux lectures tant qu'elle n'est pas terminée : le
  // catalogue, plus complet, l'emporte.
  const dejaLues = new Set(inscriptionsAVenir.map((activite) => activite.id));
  const notes = new Map(
    (retours.data as { activite_id: string; note: number }[]).map(
      ({ activite_id, note }) => [activite_id, note],
    ),
  );
  const inscriptions = [
    ...inscriptionsAVenir,
    ...inscriptionsPassees.filter((activite) => !dejaLues.has(activite.id)),
  ].map((activite) => ({
    ...activite,
    mon_retour_note: notes.get(activite.id) ?? null,
  }));

  return classerMesActivites({
    inscriptions: inscriptions,
    organisees: organisees.data as ActiviteDuJour[],
    maintenant,
  });
}
