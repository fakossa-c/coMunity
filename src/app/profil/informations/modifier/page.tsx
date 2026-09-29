import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { EcranSecondaire } from "@/components/cadre";
import { TitrePage } from "@/components/titre-page";
import { lireInformations } from "@/lib/lecture-informations";
import { lireSession } from "@/lib/session";
import { FormulaireInformations } from "./formulaire";

export const metadata: Metadata = { title: "Modifier mes informations" };

const CHEMIN = "/profil/informations/modifier";

export default async function ModifierMesInformations() {
  const session = await lireSession();
  if (!session) redirect(`/connexion?suivant=${encodeURIComponent(CHEMIN)}`);
  const informations = await lireInformations(session.id);
  // Un membre du conseil syndical sans prénom ni nom passe d'abord par l'écran qui les demande.
  if (!informations?.pseudo) redirect("/profil/informations");

  return (
    <EcranSecondaire
      retour={{ href: "/profil/informations", libelle: "Annuler" }}
      actionDansLeFormulaire
    >
      <TitrePage titre="Modifier mes informations" />
      <FormulaireInformations
        depart={{
          pseudo: informations.pseudo,
          telephone: informations.telephone ?? "",
          batiment: informations.batiment ?? "",
          etage: informations.etage === null ? "" : String(informations.etage),
        }}
        photo={
          informations.photo_chemin
            ? {
                chemin: informations.photo_chemin,
                url: informations.photo ?? "",
              }
            : null
        }
      />
    </EcranSecondaire>
  );
}
