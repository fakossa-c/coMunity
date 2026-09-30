import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { EcranSecondaire } from "@/components/cadre";
import { TitrePage } from "@/components/titre-page";

/**
 * Page des tests e2e de l'écran d'erreur : sa lecture échoue tant que le cookie `essai-erreur` est
 * posé. Introuvable hors du serveur des tests, qui pose `ESSAI_ERREUR_E2E`.
 */
export default async function EssaiErreur() {
  const lecture = (await cookies()).get("essai-erreur");
  if (process.env.ESSAI_ERREUR_E2E !== "1") notFound();
  if (lecture) throw new Error("Lecture d'essai en échec.");

  return (
    <EcranSecondaire retour={{ href: "/", destination: "Accueil" }}>
      <TitrePage titre="Lecture réussie" />
    </EcranSecondaire>
  );
}
