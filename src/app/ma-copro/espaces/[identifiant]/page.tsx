import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Bientot } from "@/components/bientot";
import { EcranSecondaire } from "@/components/cadre";
import { FicheEspaceCommun } from "@/components/fiche-espace-commun";
import {
  lireEspacesCommuns,
  lireUrlsMediasEspace,
} from "@/lib/regles-residence";
import { estSyndicActif, lireSession, statutResident } from "@/lib/session";

export const metadata: Metadata = { title: "Espace commun" };

type Props = { params: Promise<{ identifiant: string }> };

/** La fiche d'un espace commun : les mêmes lecteurs que Ma copro, dont elle est une page secondaire. */
export default async function PageFicheEspace({ params }: Props) {
  const { identifiant } = await params;
  const chemin = `/ma-copro/espaces/${identifiant}`;
  const session = await lireSession();
  if (!session) redirect(`/connexion?suivant=${encodeURIComponent(chemin)}`);

  // Un résident refusé ou retiré ne voit que son message d'état, posé par l'écran.
  const statut = statutResident(session);
  const peutLire =
    estSyndicActif(session) || statut === "valide" || statut === "en_attente";
  const espaces = peutLire ? await lireEspacesCommuns() : null;
  const espace = espaces?.find((e) => e.id === identifiant);
  if (peutLire && !espace) notFound();

  const medias = espace ? await lireUrlsMediasEspace(espace) : null;

  return (
    <EcranSecondaire retour={{ href: "/ma-copro", libelle: "Ma copro" }}>
      {espace && espaces ? (
        <FicheEspaceCommun
          espace={espace}
          photos={medias?.photos.map((photo) => photo.url).filter(Boolean)}
          plan={medias?.plan?.url || undefined}
          autres={espaces.filter((e) => e.id !== espace.id)}
        />
      ) : (
        <Bientot
          icone="lock"
          message="Votre compte n'a pas accès à cette rubrique. Si c'est une erreur, adressez-vous à un membre du conseil syndical."
        />
      )}
    </EcranSecondaire>
  );
}
