import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BarreActionFixe } from "@/components/barre-action-fixe";
import { BlocTexte } from "@/components/bloc-texte";
import { Bouton, classesBouton } from "@/components/bouton";
import { BoutonCopier } from "@/components/bouton-copier";
import { BoutonPartager } from "@/components/bouton-partager";
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
import {
  creneau,
  jourLong,
  lienWhatsApp,
  messageWhatsApp,
} from "@/lib/partage-activite";

type Props = { params: Promise<{ identifiant: string }> };

/** « Samedi 24 octobre, de 16h00 à 18h30 · Jardin partagé » : la description de l'aperçu. */
function resume(fiche: FicheActivite) {
  return `${jourLong(fiche.date_activite)}, ${creneau(fiche.heure_debut, fiche.heure_fin)} · ${fiche.lieu}`;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { identifiant } = await params;
  const fiche = await lireFiche(identifiant);
  if (!fiche) return { title: "Activité introuvable" };

  const description = resume(fiche);
  return {
    title: fiche.titre,
    description,
    metadataBase: new URL(await origine()),
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
          {categorie.libelle} ·{" "}
          {fiche.proposee_par_syndic
            ? "Proposée par le syndic"
            : "Initiative de résident"}
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
        {fiche.organisateur_prenom && (
          <ProposePar
            initiale={fiche.organisateur_prenom.charAt(0).toUpperCase()}
            nom={fiche.organisateur_prenom}
          />
        )}
        {fiche.description && (
          <BlocTexte titre="Description">{fiche.description}</BlocTexte>
        )}
        <a
          href={lienWhatsApp(messageWhatsApp(fiche, lien))}
          target="_blank"
          rel="noopener noreferrer"
          className={classesBouton("contour")}
        >
          <Icone nom="forum" />
          Relayer sur le groupe WhatsApp
        </a>
        <BoutonCopier
          texte={lien}
          libelle="Copier le lien"
          confirmation="Lien copié"
        />
      </article>
    </EcranSecondaire>
  );
}
