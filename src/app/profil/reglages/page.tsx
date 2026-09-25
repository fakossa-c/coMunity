import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { EcranSecondaire } from "@/components/cadre";
import { TitrePage } from "@/components/titre-page";
import { lireSession } from "@/lib/session";
import { ReglagesAffichage } from "./reglages-affichage";

export const metadata: Metadata = { title: "Mes réglages" };

export default async function MesReglages() {
  const session = await lireSession();
  if (!session) redirect("/connexion?suivant=%2Fprofil%2Freglages");

  return (
    <EcranSecondaire retour={{ href: "/profil", libelle: "Profil" }}>
      <div className="flex max-w-xl flex-col gap-bloc">
        <TitrePage titre="Mes réglages" />
        <ReglagesAffichage taille={session.taille} theme={session.theme} />
      </div>
    </EcranSecondaire>
  );
}
