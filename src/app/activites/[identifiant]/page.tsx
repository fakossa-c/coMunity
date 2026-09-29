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
import { GaleriePhotos } from "@/components/galerie-photos";
import { Icone } from "@/components/icone";
import type { NomIcone } from "@/components/icones";
import { Jauge } from "@/components/jauge";
import { PanneauInfos } from "@/components/panneau-infos";
import { ProposePar } from "@/components/propose-par";
import { VisuelActivite } from "@/components/visuel-activite";
import { categoriesActivite } from "@/lib/categories-activite";
import {
  adressePhoto,
  lienFiche,
  lireFiche,
  origine,
  type FicheActivite,
} from "@/lib/fiche-activite";
import { estMiseDeCote } from "@/lib/decision-moderation";
import { libelleMinimum } from "@/lib/inscription-activite";
import { adressesPhotosProfils } from "@/lib/lecture-photos-profils";
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
import { ModerationConseil } from "./moderation-conseil";
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
 * activité annulée, en relecture ou masquée, le seul constat. Le créateur gère son activité, et le
 * conseil syndical la modère, depuis le corps de la fiche.
 */
function actionDeLaFiche(fiche: FicheActivite, statut: StatutVisiteur) {
  if (estMiseDeCote(fiche.statut)) {
    return (
      <BarreActionFixe>
        <p className="w-full text-center font-headline text-body-lg text-on-surface-variant">
          Cette activité n&apos;est pas publiée : les inscriptions sont fermées.
        </p>
      </BarreActionFixe>
    );
  }
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

/**
 * Ce que le créateur lit de la modération : l'état de son activité quand le conseil syndical l'a
 * mise de côté, et le message de sa dernière décision.
 */
function DecisionDuConseil({
  statut,
  message,
}: {
  statut: FicheActivite["statut"];
  message: string | null;
}) {
  return (
    <>
      {statut === "en_relecture" && (
        <EncartPastel titre="Pas encore publiée">
          Le conseil syndical relit votre activité avant de la publier. Vous et
          lui êtes les seuls à la voir pour l&apos;instant.
        </EncartPastel>
      )}
      {statut === "masquee" && (
        <EncartPastel titre="Masquée par le conseil syndical">
          Les voisins ne voient plus votre activité, ni son lien.
        </EncartPastel>
      )}
      {message && (
        <section aria-label="Message du conseil syndical">
          <EncartPastel titre="Message du conseil syndical">
            {message}
          </EncartPastel>
        </section>
      )}
    </>
  );
}

export default async function Fiche({ params }: Props) {
  const { identifiant } = await params;
  const fiche = await lireFiche(identifiant);
  if (!fiche) notFound();

  const lien = await lienFiche(identifiant);
  const categorie = categoriesActivite[fiche.categorie];
  const session = await lireSession();
  // La photo de l'organisateur remplace l'initiale de son pseudo, quand il en a une.
  const photoOrganisateur = fiche.organisateur_photo_chemin
    ? (await adressesPhotosProfils([fiche.organisateur_photo_chemin])).get(
        fiche.organisateur_photo_chemin,
      )
    : undefined;

  const annulee = fiche.statut === "annulee";
  // En relecture ou masquée, l'activité n'a pas de lien à partager : les voisins ne la voient pas.
  const partageable = fiche.statut === "publiee";
  const conseilSyndical = estSyndicActif(session);
  // Distinct de `estPassee` (jour calendaire, ci-dessus pour EtatActivite) : ici la date et
  // l'heure de fin précises, l'échéance que la RLS de laisser_retour vérifie aussi.
  const activitePassee = activiteEstPassee(fiche);

  return (
    <EcranSecondaire
      retour={{ href: "/", libelle: "Retour" }}
      partager={
        partageable ? (
          <BoutonPartager titre={fiche.titre} lien={lien} />
        ) : undefined
      }
      action={actionDeLaFiche(fiche, statutVisiteur(session?.statut))}
    >
      <article className="flex flex-col gap-[14px]">
        {fiche.photos.length > 0 ? (
          <GaleriePhotos
            photos={fiche.photos.map(adressePhoto)}
            titre={fiche.titre}
          />
        ) : (
          <VisuelActivite
            pictogramme={fiche.pictogramme as NomIcone}
            categorie={fiche.categorie}
          />
        )}
        <p className="flex items-center gap-2 pt-1.5 font-headline text-label-md text-on-surface-variant">
          <span className="text-primary">
            <Icone nom={categorie.pictogramme} taille={22} />
          </span>
          {categorie.libelle} · Initiative de résident
        </p>
        <h1 className="font-headline text-headline-xl-mobile text-on-surface desktop:text-headline-xl">
          {fiche.titre}
        </h1>
        {fiche.est_organisateur && (
          <DecisionDuConseil
            statut={fiche.statut}
            message={fiche.message_moderation}
          />
        )}
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
            photo={photoOrganisateur}
          />
        )}
        {fiche.mot_accueil && <EncartPastel>{fiche.mot_accueil}</EncartPastel>}
        {fiche.description && (
          <BlocTexte titre="Description">{fiche.description}</BlocTexte>
        )}
        {fiche.consignes_espace && (
          <BlocTexte titre="Consignes de l'espace commun">
            {fiche.consignes_espace}
          </BlocTexte>
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
          (fiche.est_organisateur || conseilSyndical) && (
            <Retours identifiant={identifiant} />
          )}
        {partageable && (
          <>
            <BoutonRelayer message={messageWhatsApp(fiche, lien)} />
            <BoutonCopier
              texte={lien}
              libelle="Copier le lien"
              confirmation="Lien copié"
            />
          </>
        )}
        {fiche.est_organisateur && (
          <GestionActivite
            identifiant={identifiant}
            annulee={annulee}
            modifiable={fiche.statut === "publiee"}
            annulable={!estMiseDeCote(fiche.statut)}
            placesPrises={fiche.places_prises}
          />
        )}
        {conseilSyndical && (
          <ModerationConseil
            identifiant={identifiant}
            titre={fiche.titre}
            statut={fiche.statut}
            raison={fiche.raison_relecture}
          />
        )}
      </article>
    </EcranSecondaire>
  );
}
