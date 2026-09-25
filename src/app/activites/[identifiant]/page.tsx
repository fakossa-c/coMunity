import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BarreActionFixe } from "@/components/barre-action-fixe";
import { BlocTexte } from "@/components/bloc-texte";
import { Bouton } from "@/components/bouton";
import { BoutonCopier } from "@/components/bouton-copier";
import { BoutonPartager } from "@/components/bouton-partager";
import { BoutonRelayer } from "@/components/bouton-relayer";
import { EcranSecondaire } from "@/components/cadre";
import { Icone } from "@/components/icone";
import type { NomIcone } from "@/components/icones";
import { PanneauInfos } from "@/components/panneau-infos";
import { ProposePar } from "@/components/propose-par";
import { VisuelActivite } from "@/components/visuel-activite";
import { categoriesActivite } from "@/lib/categories-activite";
import {
  lienFiche,
  lireFiche,
  origine,
  type FicheActivite,
} from "@/lib/fiche-activite";
import { creneau, jourLong, messageWhatsApp } from "@/lib/partage-activite";

type Props = { params: Promise<{ identifiant: string }> };

/** « Samedi 24 octobre, de 16h00 à 18h30 · Jardin partagé » : la description de l'aperçu. */
function resume(fiche: FicheActivite) {
  return `${jourLong(fiche.date_activite)}, ${creneau(fiche.heure_debut, fiche.heure_fin)} · ${fiche.lieu}`;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { identifiant } = await params;
  const fiche = await lireFiche(identifiant);
  const metadataBase = new URL(await origine());
  if (!fiche) return { title: "Activité introuvable", metadataBase };

  const description = resume(fiche);
  return {
    title: fiche.titre,
    description,
    metadataBase,
    openGraph: {
      type: "website",
      siteName: "coMunity",
      locale: "fr_FR",
      title: fiche.titre,
      description,
      url: await lienFiche(identifiant),
    },
  };
}

export default async function Fiche({ params }: Props) {
  const { identifiant } = await params;
  const fiche = await lireFiche(identifiant);
  if (!fiche) notFound();

  const lien = await lienFiche(identifiant);
  const categorie = categoriesActivite[fiche.categorie];

  return (
    <EcranSecondaire
      retour={{ href: "/", libelle: "Retour" }}
      partager={<BoutonPartager titre={fiche.titre} lien={lien} />}
      action={
        // L'inscription arrive avec le ticket #8 : le bouton annonce déjà sa place.
        <BarreActionFixe>
          <div className="flex w-full flex-col items-center gap-1">
            <Bouton pleineLargeur disabled className="text-body-lg">
              Je participe
            </Bouton>
            <p className="text-body-md text-on-surface-variant">
              Les inscriptions ouvrent bientôt.
            </p>
          </div>
        </BarreActionFixe>
      }
    >
      <article className="flex flex-col gap-[14px]">
        <VisuelActivite pictogramme={fiche.pictogramme as NomIcone} />
        <p className="flex items-center gap-2 pt-1.5 font-headline text-label-md text-on-surface-variant">
          <span className="text-primary">
            <Icone nom={categorie.pictogramme} taille={22} />
          </span>
          {categorie.libelle} · Initiative de résident
        </p>
        <h1 className="font-headline text-headline-xl-mobile text-on-surface desktop:text-headline-xl">
          {fiche.titre}
        </h1>
        <PanneauInfos
          lignes={[
            {
              icone: "event",
              titre: jourLong(fiche.date_activite),
              detail: creneau(fiche.heure_debut, fiche.heure_fin),
            },
            { icone: "location_on", titre: fiche.lieu },
          ]}
        />
        {fiche.organisateur_nom_affiche && (
          <ProposePar
            initiale={fiche.organisateur_nom_affiche.charAt(0).toUpperCase()}
            nom={fiche.organisateur_nom_affiche}
          />
        )}
        {fiche.description && (
          <BlocTexte titre="Description">{fiche.description}</BlocTexte>
        )}
        <BoutonRelayer message={messageWhatsApp(fiche, lien)} />
        <BoutonCopier
          texte={lien}
          libelle="Copier le lien"
          confirmation="Lien copié"
        />
      </article>
    </EcranSecondaire>
  );
}
