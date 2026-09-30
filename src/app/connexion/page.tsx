import type { Metadata } from "next";
import Link from "next/link";
import { EcranConnexion } from "@/components/cadre";
import { EncartPastel } from "@/components/encart-pastel";
import { Logo } from "@/components/logo";
import { TitrePage } from "@/components/titre-page";
import { cheminInterne } from "@/lib/chemin-interne";
import { FormulaireConnexion } from "./formulaire-connexion";

export const metadata: Metadata = { title: "Connexion" };

export default async function Connexion({
  searchParams,
}: {
  searchParams: Promise<{ [cle: string]: string | string[] | undefined }>;
}) {
  const { suivant, lien } = await searchParams;

  return (
    <EcranConnexion
      retour={{ href: "/", destination: "Accueil" }}
      sousLaCarte={
        <EncartPastel titre="Pas encore de compte ?">
          <Link
            href="/inscription"
            className="inline-flex min-h-cible items-center rounded-md font-headline text-label-lg underline underline-offset-4"
          >
            Créer mon compte
          </Link>
        </EncartPastel>
      }
    >
      {/* Sur ordinateur, la barre du haut du cadre porte déjà le logo. */}
      <div className="mb-space-lg desktop:hidden">
        <Logo hauteur={40} />
      </div>
      <TitrePage
        titre="Connexion"
        sousTitre="Retrouvez les activités et les annonces de votre résidence."
      />
      <FormulaireConnexion
        suivant={cheminInterne(typeof suivant === "string" ? suivant : null)}
        messageInitial={
          lien === "invalide"
            ? "Ce lien a déjà servi ou a expiré. Demandez-en un autre avec « Mot de passe oublié ? »."
            : null
        }
      />
    </EcranConnexion>
  );
}
