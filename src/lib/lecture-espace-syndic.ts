import "server-only";
import { clientSession } from "./supabase/serveur";

/** Comptes qui attendent leur validation et activités à relire : les pastilles du menu de l'espace syndic. */
export async function lireCompteursSyndic() {
  const supabase = await clientSession();
  const [residents, moderation] = await Promise.all([
    supabase
      .from("profil")
      .select("id", { count: "exact", head: true })
      .eq("role", "resident")
      .eq("statut", "en_attente"),
    supabase
      .from("activite")
      .select("id", { count: "exact", head: true })
      .eq("statut", "en_relecture"),
  ]);
  return {
    residents: residents.count ?? 0,
    moderation: moderation.count ?? 0,
  };
}
