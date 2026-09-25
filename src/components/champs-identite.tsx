import { LONGUEUR_MAXIMALE_NOM, type Identite } from "@/lib/nom-complet";
import { Champ } from "./champ";

/** Prénom et nom d'un compte, chacun avec son erreur, repartant de la saisie refusée. */
export function ChampsIdentite({
  saisie,
  erreurs,
}: {
  saisie?: Identite;
  erreurs: { prenom?: string; nom?: string };
}) {
  return (
    <>
      <Champ
        libelle="Prénom"
        name="prenom"
        autoComplete="given-name"
        maxLength={LONGUEUR_MAXIMALE_NOM}
        required
        defaultValue={saisie?.prenom}
        erreur={erreurs.prenom}
      />
      <Champ
        libelle="Nom"
        name="nom"
        autoComplete="family-name"
        maxLength={LONGUEUR_MAXIMALE_NOM}
        required
        defaultValue={saisie?.nom}
        erreur={erreurs.nom}
      />
    </>
  );
}
