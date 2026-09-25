import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { EcranSecondaire } from "@/components/cadre";
import { TitrePage } from "@/components/titre-page";
import { lireSession } from "@/lib/session";
import { FormulaireMotDePasse } from "./formulaire";

export const metadata: Metadata = { title: "Modifier le mot de passe" };

export default async function ModifierMotDePasse() {
  const session = await lireSession();
  if (!session) {
    redirect("/connexion?suivant=%2Fprofil%2Fidentifiants%2Fmot-de-passe");
  }

  return (
    <EcranSecondaire
      retour={{ href: "/profil/identifiants", libelle: "Annuler" }}
      actionDansLeFormulaire
    >
      <TitrePage titre="Modifier le mot de passe" />
      <FormulaireMotDePasse email={session.email} />
    </EcranSecondaire>
  );
}
