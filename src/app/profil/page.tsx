import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { EcranSecondaire } from "@/components/cadre";
import { EnTeteProfil } from "@/components/en-tete-profil";
import { LigneMenu } from "@/components/ligne-menu";
import { identite } from "@/lib/identite";
import { lireSession } from "@/lib/session";

export const metadata: Metadata = { title: "Profil" };

export default async function Profil() {
  const session = await lireSession();
  if (!session) redirect("/connexion?suivant=%2Fprofil");

  return (
    <EcranSecondaire retour={{ href: "/", libelle: "Accueil" }}>
      <div className="flex max-w-xl flex-col gap-space-lg pt-2">
        <EnTeteProfil {...identite(session)} />
        <nav aria-label="Rubriques du profil" className="flex flex-col gap-2.5">
          <LigneMenu
            href="/profil/identifiants"
            icone="key"
            titre="Mes identifiants"
            detail="Email, mot de passe, déconnexion"
          />
        </nav>
      </div>
    </EcranSecondaire>
  );
}
