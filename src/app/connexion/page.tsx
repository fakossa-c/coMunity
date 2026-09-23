import type { Metadata } from "next";
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
    <div className="max-w-md">
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
    </div>
  );
}
