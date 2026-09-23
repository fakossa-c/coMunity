import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { TitrePage } from "@/components/titre-page";
import { lireSession } from "@/lib/session";
import { FormulaireInscription } from "./formulaire";

export const metadata: Metadata = { title: "Créer mon compte" };

export default async function Inscription() {
  if (await lireSession()) redirect("/");

  return (
    <div className="max-w-md">
      <TitrePage
        titre="Créer mon compte"
        sousTitre="Rejoignez la vie de votre résidence. Le syndic validera votre compte, puis vous pourrez participer aux activités."
      />
      <FormulaireInscription />
      <p className="mt-space-lg text-body-lg">
        Déjà un compte ?{" "}
        <Link
          href="/connexion"
          className="inline-flex min-h-[52px] items-center rounded-md font-headline text-label-lg text-primary underline underline-offset-4"
        >
          Se connecter
        </Link>
      </p>
    </div>
  );
}
