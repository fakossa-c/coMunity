import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { EcranSecondaire } from "@/components/cadre";
import { EnTeteProfil } from "@/components/en-tete-profil";
import { LigneMenu } from "@/components/ligne-menu";
import { identite } from "@/lib/identite";
import { adresse } from "@/lib/informations-profil";
import { lireInformations } from "@/lib/lecture-informations";
import { lireSession } from "@/lib/session";

export const metadata: Metadata = { title: "Profil" };

export default async function Profil() {
  const session = await lireSession();
  if (!session) redirect("/connexion?suivant=%2Fprofil");
  const informations = await lireInformations(session.id);

  return (
    <EcranSecondaire retour={{ href: "/", destination: "Accueil" }}>
      <div className="flex max-w-xl flex-col gap-space-lg pt-2 desktop:max-w-none desktop:gap-space-xl">
        <EnTeteProfil
          {...identite({ ...session, pseudo: informations?.pseudo ?? null })}
          adresse={adresse(
            informations?.batiment ?? null,
            informations?.etage ?? null,
          )}
          photo={informations?.photo}
        />
        <nav
          aria-label="Rubriques du profil"
          className="flex flex-col gap-2.5 desktop:grid desktop:grid-cols-2 desktop:gap-bloc"
        >
          <LigneMenu
            href="/profil/identifiants"
            icone="key"
            titre="Mes identifiants"
            detail="Email, mot de passe, déconnexion"
          />
          <LigneMenu
            href="/profil/informations"
            icone="badge"
            titre="Mes informations"
            detail="Contrôlez les informations partagées"
          />
          <LigneMenu
            href="/profil/interets"
            icone="interests"
            titre="Mes intérêts"
            detail="Ce qui vous plaît, en quelques mots"
          />
          <LigneMenu
            href="/profil/reglages"
            icone="accessible"
            titre="Mes réglages"
            detail="Taille des caractères, thème"
          />
        </nav>
      </div>
    </EcranSecondaire>
  );
}
