import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { classesBouton } from "@/components/bouton";
import { EcranSecondaire } from "@/components/cadre";
import { CarteLignes } from "@/components/carte-lignes";
import { EnTeteProfil } from "@/components/en-tete-profil";
import { Annonce } from "@/components/formulaire";
import { Icone } from "@/components/icone";
import { TitreSection } from "@/components/titre-section";
import { adresse } from "@/lib/informations-profil";
import { identite } from "@/lib/identite";
import { lireInformations } from "@/lib/lecture-informations";
import { lireSession } from "@/lib/session";
import { TitreProfil } from "../titre-profil";
import { InformationsVisibles } from "./informations-visibles";

export const metadata: Metadata = { title: "Mes informations" };

const CHEMIN = "/profil/informations";

export default async function MesInformations({
  searchParams,
}: {
  searchParams: Promise<{ [cle: string]: string | string[] | undefined }>;
}) {
  const { fait } = await searchParams;
  const session = await lireSession();
  if (!session) redirect(`/connexion?suivant=${encodeURIComponent(CHEMIN)}`);
  const informations = await lireInformations(session.id);
  const moi = identite({ ...session, pseudo: informations?.pseudo ?? null });

  return (
    <EcranSecondaire retour={{ href: "/profil", libelle: "Profil" }}>
      <div className="flex max-w-xl flex-col gap-bloc desktop:max-w-none">
        <TitreProfil
          titre="Mes informations"
          sousTitre="Contrôlez les informations partagées"
        />
        <Annonce
          message={
            fait === "enregistre" ? "Vos informations sont enregistrées." : null
          }
        />
        <EnTeteProfil
          taille="compact"
          initiale={moi.initiale}
          nom={moi.nom}
          adresse={adresse(
            informations?.batiment ?? null,
            informations?.etage ?? null,
          )}
          photo={informations?.photo}
        />
        {/* Sur ordinateur, ce que voient les voisins à gauche ; ce que voit le conseil syndical à droite. */}
        <div className="flex flex-col gap-bloc desktop:grid desktop:grid-cols-2 desktop:items-start desktop:gap-8">
          {informations?.pseudo ? (
            <div className="flex flex-col gap-bloc">
              <InformationsVisibles
                pseudo={informations.pseudo}
                telephone={informations.telephone}
                batiment={informations.batiment}
                etage={informations.etage}
                visibilites={{
                  telephone: informations.telephone_visible,
                  batiment: informations.batiment_visible,
                  etage: informations.etage_visible,
                }}
              />
            </div>
          ) : null}
          <div className="flex flex-col gap-bloc">
            <section className="flex flex-col gap-2.5">
              <TitreSection>Réservés au conseil syndical</TitreSection>
              <CarteLignes
                libelle="Prénom et nom"
                lignes={[
                  {
                    icone: "person",
                    titre: "Prénom",
                    detail: informations?.prenom ?? "Non renseigné",
                  },
                  {
                    icone: "badge",
                    titre: "Nom",
                    detail: informations?.nom ?? "Non renseigné",
                  },
                ]}
              />
              <p className="text-body-md text-on-surface-variant">
                Votre prénom et votre nom ne servent qu&apos;au conseil
                syndical, pour valider votre compte. Vos voisins ne les voient
                jamais.
              </p>
            </section>
            <p className="text-body-md text-on-surface-variant">
              Votre pseudo est toujours visible : c&apos;est ainsi que vos
              voisins vous reconnaissent. Le conseil syndical voit toutes vos
              informations.
            </p>
            <Link
              href="/profil/informations/modifier"
              className={`${classesBouton("contour", true)} desktop:w-auto desktop:self-start`}
            >
              <Icone nom="edit" />
              Modifier mes informations
            </Link>
          </div>
        </div>
      </div>
    </EcranSecondaire>
  );
}
