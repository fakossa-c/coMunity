import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { EcranSecondaire } from "@/components/cadre";
import { TitrePage } from "@/components/titre-page";

/**
 * Page des tests e2e de l'écran d'erreur : sa lecture échoue tant que le cookie `essai-erreur` est
 * posé. Introuvable hors du serveur des tests, qui pose `ESSAI_ERREUR_E2E`.
 */
export default async function EssaiErreur() {
  // Les cookies d'abord : la page devient dynamique, et la variable se lit à chaque requête
  // plutôt qu'une fois au build, où elle est absente.
  const lectureEnEchec = (await cookies()).has("essai-erreur");
  if (process.env.ESSAI_ERREUR_E2E !== "1") notFound();
  if (lectureEnEchec) throw new Error("Lecture d'essai en échec.");

  return (
    <EcranSecondaire retour={{ href: "/", destination: "Accueil" }}>
      <TitrePage titre="Lecture réussie" />
    </EcranSecondaire>
  );
}
