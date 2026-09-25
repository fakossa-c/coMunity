import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { EcranSecondaire } from "@/components/cadre";
import { TitrePage } from "@/components/titre-page";
import { lireSession } from "@/lib/session";
import { FormulaireEmail } from "./formulaire";

export const metadata: Metadata = { title: "Modifier l'email" };

export default async function ModifierEmail() {
  const session = await lireSession();
  if (!session) {
    redirect("/connexion?suivant=%2Fprofil%2Fidentifiants%2Femail");
  }

  return (
    <EcranSecondaire
      retour={{ href: "/profil/identifiants", libelle: "Annuler" }}
      actionDansLeFormulaire
    >
      <TitrePage titre="Modifier l'email" />
      <FormulaireEmail actuel={session.email} />
    </EcranSecondaire>
  );
}
