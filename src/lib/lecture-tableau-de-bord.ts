import "server-only";
import { clientSession } from "./supabase/serveur";
import type {
  LigneClassement,
  LigneMois,
  LigneRemplissage,
  Periode,
  Synthese,
} from "./tableau-de-bord";

/** Combien d'activités le classement des mieux notées en montre. */
const NOMBRE_CLASSEES = 10;

export type TableauDeBord = {
  synthese: Synthese;
  remplissage: LigneRemplissage[];
  classement: LigneClassement[];
  parMois: LigneMois[];
};

/**
 * Tout ce que montre le tableau de bord pour une période. Les quatre fonctions SQL refusent
 * quiconque n'est pas membre du conseil syndical : la page vérifie l'accès avant, cette lecture
 * échoue sinon.
 */
export async function lireTableauDeBord(
  periode: Periode,
): Promise<TableauDeBord> {
  const supabase = await clientSession();
  const bornes = { p_debut: periode.debut, p_fin: periode.fin };
  const [synthese, remplissage, classement, parMois] = await Promise.all([
    supabase.rpc("tableau_bord_synthese", bornes).single<Synthese>(),
    supabase.rpc("tableau_bord_remplissage", bornes),
    supabase.rpc("tableau_bord_classement", {
      ...bornes,
      p_limite: NOMBRE_CLASSEES,
    }),
    supabase.rpc("tableau_bord_par_mois", bornes),
  ]);
  const erreur =
    synthese.error ?? remplissage.error ?? classement.error ?? parMois.error;
  if (erreur) throw new Error(`Tableau de bord illisible : ${erreur.message}`);
  return {
    synthese: synthese.data!,
    remplissage: remplissage.data as LigneRemplissage[],
    classement: classement.data as LigneClassement[],
    parMois: parMois.data as LigneMois[],
  };
}
