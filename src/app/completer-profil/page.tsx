import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { EcranSecondaire } from "@/components/cadre";
import { TitrePage } from "@/components/titre-page";
import { cheminInterne } from "@/lib/chemin-interne";
import {
  accueilDe,
  CHEMIN_COMPLETION,
  doitCompleterProfil,
  lireSession,
} from "@/lib/session";
import { FormulaireCompletion } from "./formulaire";

export const metadata: Metadata = { title: "Présentez-vous" };

/**
 * Un membre du conseil syndical sans prénom ni nom y passe avant tout autre écran, puis continue
 * vers la page qu'il demandait (`suivant`).
 */
export default async function CompleterProfil({
  searchParams,
}: {
  searchParams: Promise<{ [cle: string]: string | string[] | undefined }>;
}) {
  const { suivant } = await searchParams;
  const destination = cheminInterne(
    typeof suivant === "string" ? suivant : null,
  );
  const session = await lireSession();
  if (!session) {
    redirect(`/connexion?suivant=${encodeURIComponent(CHEMIN_COMPLETION)}`);
  }
  if (!doitCompleterProfil(session)) {
    redirect(await accueilDe(session, destination));
  }

  return (
    <EcranSecondaire
      retour={{ href: "/", libelle: "Accueil" }}
      completionExigee={false}
    >
      <div className="max-w-md">
        <TitrePage
          titre="Présentez-vous à vos voisins"
          sousTitre="Membre du conseil syndical, vous êtes aussi un résident. Vos voisins vous reconnaîtront à votre prénom et à votre nom."
        />
        <FormulaireCompletion suivant={destination} />
      </div>
    </EcranSecondaire>
  );
}
