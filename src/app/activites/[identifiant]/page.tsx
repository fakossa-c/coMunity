import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BarreActionFixe } from "@/components/barre-action-fixe";
import { BlocTexte } from "@/components/bloc-texte";
import { BoutonCopier } from "@/components/bouton-copier";
import { BoutonPartager } from "@/components/bouton-partager";
import { BoutonRelayer } from "@/components/bouton-relayer";
import { EcranSecondaire } from "@/components/cadre";
import { EncartPastel } from "@/components/encart-pastel";
import { EtatActivite } from "@/components/etat-activite";
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
import { libelleMinimum } from "@/lib/inscription-activite";
import {
  creneau,
  estPassee,
  jourLong,
  messageWhatsApp,
} from "@/lib/partage-activite";
import { activiteEstPassee } from "@/lib/retour-activite";
import { estSyndicActif, lireSession } from "@/lib/session";
import { BlocInscription, type StatutVisiteur } from "./bloc-inscription";
import { FormulaireRetour } from "./formulaire-retour";
import { GestionActivite } from "./gestion-activite";
import { Participants } from "./participants";
import { Retours } from "./retours";

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

/** Ce que peut faire la personne qui consulte la fiche, à partir de sa session. */
function statutVisiteur(statut: string | null | undefined): StatutVisiteur {
  if (!statut) return "visiteur";
  return statut === "valide" ? "valide" : "en_attente";
}

/**
 * L'action fixée en bas de la fiche : l'inscription, pour tous, créateur compris ; pour une
 * activité annulée, le seul constat. Le créateur gère son activité depuis le corps de la fiche.
 */
function actionDeLaFiche(fiche: FicheActivite, statut: StatutVisiteur) {
  if (fiche.statut === "annulee") {
    return (
      <BarreActionFixe>
        <p className="w-full text-center font-headline text-body-lg text-on-surface-variant">
          L&apos;organisateur a annulé cette activité.
        </p>
      </BarreActionFixe>
    );
  }
  return <BlocInscription fiche={fiche} statut={statut} />;
}

export default async function Fiche({ params }: Props) {
  const { identifiant } = await params;
  const fiche = await lireFiche(identifiant);
  if (!fiche) notFound();

  const lien = await lienFiche(identifiant);
  const categorie = categoriesActivite[fiche.categorie];
  const session = await lireSession();

  const annulee = fiche.statut === "annulee";
  const activitePassee = activiteEstPassee(fiche);

  return (
    <EcranSecondaire
      retour={{ href: "/", libelle: "Retour" }}
      partager={<BoutonPartager titre={fiche.titre} lien={lien} />}
      action={actionDeLaFiche(fiche, statutVisiteur(session?.statut))}
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
        <EtatActivite
          statut={fiche.statut}
          capaciteMin={fiche.capacite_min}
          placesPrises={fiche.places_prises}
          passee={estPassee(fiche.date_activite)}
        />
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
        {!annulee && activitePassee && fiche.mes_accompagnants !== null && (
          <FormulaireRetour fiche={fiche} />
        )}
        {!annulee &&
          activitePassee &&
          (fiche.est_organisateur || estSyndicActif(session)) && (
            <Retours identifiant={identifiant} />
          )}
        {!annulee && (
          <BoutonRelayer message={messageWhatsApp(fiche, lien)} />
        )}
        <BoutonCopier
          texte={lien}
          libelle="Copier le lien"
          confirmation="Lien copié"
        />
        {fiche.est_organisateur && (
          <GestionActivite
            identifiant={identifiant}
            annulee={annulee}
            placesPrises={fiche.places_prises}
          />
        )}
      </article>
    </EcranSecondaire>
  );
}
