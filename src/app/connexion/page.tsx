import type { Metadata } from "next";
import Link from "next/link";
import { EcranSecondaire } from "@/components/cadre";
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
    <EcranSecondaire
      retour={{ href: "/", libelle: "Accueil" }}
      avecCompte={false}
    >
      <div className="flex max-w-md flex-col">
        <div className="mb-space-lg">
          <Logo hauteur={40} />
        </div>
        <TitrePage
          titre="Connexion"
          sousTitre="Accédez à votre espace avec votre email et votre mot de passe."
        />
        <FormulaireConnexion
          suivant={cheminInterne(typeof suivant === "string" ? suivant : null)}
          messageInitial={
            lien === "invalide"
              ? "Ce lien n'est plus valable : il a déjà servi ou il a expiré. Demandez un nouveau lien avec « Mot de passe oublié ? »."
              : null
          }
        />
        <div className="mt-space-lg">
          <EncartPastel titre="Nouveau dans la résidence ?">
            <Link
              href="/inscription"
              className="inline-flex min-h-cible items-center rounded-md font-headline text-label-lg underline underline-offset-4"
            >
              Créer mon compte
            </Link>
          </EncartPastel>
        </div>
      </div>
    </EcranSecondaire>
  );
}
