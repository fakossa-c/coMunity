import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BlocTexte } from "@/components/bloc-texte";
import { BoutonCopier } from "@/components/bouton-copier";
import { BoutonPartager } from "@/components/bouton-partager";
import { BoutonRelayer } from "@/components/bouton-relayer";
import { EcranSecondaire } from "@/components/cadre";
import { EncartPastel } from "@/components/encart-pastel";
import { EtiquettesActivite } from "@/components/etiquette";
import { Icone } from "@/components/icone";
import type { NomIcone } from "@/components/icones";
import { Jauge } from "@/components/jauge";
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
import { lireSession } from "@/lib/session";
import { BlocInscription, type StatutVisiteur } from "./bloc-inscription";
import { Participants } from "./participants";

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

/** « Au moins 4 participants », « Au moins 1 participant ». */
function libelleMinimum(minimum: number) {
  return minimum === 1
    ? "Au moins 1 participant"
    : `Au moins ${minimum} participants`;
}

/** Ce que peut faire la personne qui consulte la fiche, à partir de sa session. */
function statutVisiteur(statut: string | null | undefined): StatutVisiteur {
  if (!statut) return "visiteur";
  return statut === "valide" ? "valide" : "en_attente";
}

export default async function Fiche({ params }: Props) {
  const { identifiant } = await params;
  const fiche = await lireFiche(identifiant);
  if (!fiche) notFound();

  const lien = await lienFiche(identifiant);
  const categorie = categoriesActivite[fiche.categorie];
  const session = await lireSession();

  return (
    <EcranSecondaire
      retour={{ href: "/", libelle: "Retour" }}
      partager={<BoutonPartager titre={fiche.titre} lien={lien} />}
      action={
        <BlocInscription
          fiche={fiche}
          statut={statutVisiteur(session?.statut)}
        />
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
            {
              icone: "location_on",
              titre: fiche.lieu,
              detail: fiche.precision_acces ?? undefined,
            },
          ]}
        />
        <Jauge
          capaciteMax={fiche.capacite_max}
          placesPrises={fiche.places_prises}
        />
        {fiche.capacite_min !== null && (
          <p className="text-body-md text-on-surface-variant">
            {libelleMinimum(fiche.capacite_min)} pour que l&apos;activité ait
            lieu.
          </p>
        )}
        <EtiquettesActivite etiquettes={fiche.etiquettes} />
        {fiche.organisateur_nom_affiche && (
          <ProposePar
            initiale={fiche.organisateur_nom_affiche.charAt(0).toUpperCase()}
            nom={fiche.organisateur_nom_affiche}
          />
        )}
        {fiche.mot_accueil && <EncartPastel>{fiche.mot_accueil}</EncartPastel>}
        {fiche.description && (
          <BlocTexte titre="Description">{fiche.description}</BlocTexte>
        )}
        {fiche.conseils_pratiques && (
          <BlocTexte titre="Conseils pratiques">
            {fiche.conseils_pratiques}
          </BlocTexte>
        )}
        {fiche.materiel_prevoir && (
          <BlocTexte titre="Matériel à prévoir">
            {fiche.materiel_prevoir}
          </BlocTexte>
        )}
        {fiche.a_apporter && (
          <BlocTexte titre="Ce que vous pouvez apporter">
            {fiche.a_apporter}
          </BlocTexte>
        )}
        {session?.statut === "valide" && (
          <Participants identifiant={identifiant} />
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
