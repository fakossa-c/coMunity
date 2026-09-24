import type { Metadata } from "next";
import Link from "next/link";
import { EcranSecondaire } from "@/components/cadre";
import { TitrePage } from "@/components/titre-page";
import { lireSession } from "@/lib/session";
import { FormulaireNouveauMotDePasse } from "./formulaire";

export const metadata: Metadata = { title: "Choisissez votre mot de passe" };

/** Atteinte depuis le lien d'un email d'invitation ou de mot de passe oublié, qui a ouvert la session. */
export default async function NouveauMotDePasse() {
  const session = await lireSession();

  return (
    <EcranSecondaire
      retour={{ href: "/", libelle: "Accueil" }}
      avecCompte={false}
    >
      <div className="max-w-md">
        <TitrePage
          titre="Choisissez votre mot de passe"
          sousTitre={
            session
              ? `Pour le compte ${session.email}. Vous l'utiliserez à chaque connexion.`
              : "Ouvrez le lien reçu par email pour choisir votre mot de passe."
          }
        />
        {session ? (
          <FormulaireNouveauMotDePasse email={session.email} />
        ) : (
          <Link
            href="/mot-de-passe-oublie"
            className="flex min-h-cible items-center self-start rounded-md font-headline text-label-lg text-primary underline underline-offset-4"
          >
            Recevoir un nouveau lien
          </Link>
        )}
      </div>
    </EcranSecondaire>
  );
}
