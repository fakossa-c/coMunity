import type { Metadata } from "next";
import Link from "next/link";
import { EcranConnexion } from "@/components/cadre";
import { TitrePage } from "@/components/titre-page";
import { doitCompleterProfil, lireSession } from "@/lib/session";
import { FormulaireNouveauMotDePasse } from "./formulaire";

export const metadata: Metadata = { title: "Choisissez votre mot de passe" };

/** Atteinte depuis le lien d'un email d'invitation ou de mot de passe oublié, qui a ouvert la session. */
export default async function NouveauMotDePasse() {
  const session = await lireSession();
  const demanderIdentite = doitCompleterProfil(session);

  return (
    <EcranConnexion
      retour={{ href: "/", destination: "Accueil" }}
      avecCompte={session !== null}
      completionExigee={false}
    >
      <TitrePage
        titre="Choisissez votre mot de passe"
        sousTitre={
          !session
            ? "Ouvrez le lien reçu par email pour choisir votre mot de passe."
            : demanderIdentite
              ? `Pour le compte ${session.email}. Donnez votre prénom et votre nom (vos voisins ne verront que votre pseudo), puis choisissez le mot de passe que vous utiliserez à chaque connexion.`
              : `Pour le compte ${session.email}. Vous l'utiliserez à chaque connexion.`
        }
      />
      {session ? (
        <FormulaireNouveauMotDePasse
          email={session.email}
          demanderIdentite={demanderIdentite}
        />
      ) : (
        <Link
          href="/mot-de-passe-oublie"
          className="flex min-h-cible items-center self-start rounded-md font-headline text-label-lg text-primary underline underline-offset-4"
        >
          Recevoir un nouveau lien
        </Link>
      )}
    </EcranConnexion>
  );
}
