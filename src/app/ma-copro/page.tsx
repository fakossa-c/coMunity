import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Bientot } from "@/components/bientot";
import { EcranSecondaire } from "@/components/cadre";
import { EspacesCommunsCopro } from "@/components/espaces-communs-copro";
import { ReglementInterieur } from "@/components/reglement-interieur";
import { TitrePage } from "@/components/titre-page";
import { TitreSection } from "@/components/titre-section";
import { lireReglement } from "@/lib/lecture-reglement";
import {
  lireEspacesCommuns,
  lireUrlsPhotosEspaces,
} from "@/lib/regles-residence";
import { estSyndicActif, lireSession, statutResident } from "@/lib/session";

export const metadata: Metadata = { title: "Ma copro" };

export default async function MaCopro() {
  const session = await lireSession();
  if (!session) redirect("/connexion?suivant=%2Fma-copro");

  // Un résident refusé ou retiré ne voit que son message d'état, posé par l'écran.
  const statut = statutResident(session);
  const peutLire =
    estSyndicActif(session) || statut === "valide" || statut === "en_attente";
  const [reglement, espaces] = peutLire
    ? await Promise.all([lireReglement(), lireEspacesCommuns()])
    : [null, null];
  const photos = espaces ? await lireUrlsPhotosEspaces(espaces) : {};

  return (
    <EcranSecondaire retour={{ href: "/", libelle: "Accueil" }}>
      <TitrePage
        titre="Ma copro"
        sousTitre="Les espaces communs, puis le règlement de la résidence"
      />
      {reglement && espaces ? (
        <div className="flex flex-col gap-space-lg desktop:gap-16">
          <section
            aria-labelledby="titre-espaces-communs"
            className="flex flex-col gap-space-md"
          >
            <TitreSection id="titre-espaces-communs">
              Espaces et biens communs
            </TitreSection>
            <EspacesCommunsCopro espaces={espaces} photos={photos} />
          </section>
          <section
            aria-labelledby="titre-reglement"
            className="flex flex-col gap-space-md"
          >
            <TitreSection id="titre-reglement">
              Règlement intérieur
            </TitreSection>
            <ReglementInterieur
              {...reglement}
              ancreEspaces="#titre-espaces-communs"
            />
          </section>
        </div>
      ) : (
        <Bientot
          icone="lock"
          message="Votre compte n'a pas accès à cette rubrique. Si c'est une erreur, adressez-vous à un membre du conseil syndical."
        />
      )}
    </EcranSecondaire>
  );
}
