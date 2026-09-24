import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Bientot } from "@/components/bientot";
import { EcranSecondaire } from "@/components/cadre";
import { TitrePage } from "@/components/titre-page";
import { lireSession } from "@/lib/session";

export const metadata: Metadata = { title: "Profil" };

export default async function Profil() {
  if (!(await lireSession())) redirect("/connexion?suivant=%2Fprofil");

  return (
    <EcranSecondaire retour={{ href: "/", libelle: "Accueil" }}>
      <TitrePage
        titre="Profil"
        sousTitre="Vos identifiants, vos informations et vos réglages"
      />
      <Bientot icone="person" />
    </EcranSecondaire>
  );
}
