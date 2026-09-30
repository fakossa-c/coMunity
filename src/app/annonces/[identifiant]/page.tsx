import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BlocTexte } from "@/components/bloc-texte";
import { BoutonCopier } from "@/components/bouton-copier";
import { BoutonPartager } from "@/components/bouton-partager";
import { BoutonRelayer } from "@/components/bouton-relayer";
import { classesBouton } from "@/components/bouton";
import { EcranSecondaire } from "@/components/cadre";
import { EncartPastel } from "@/components/encart-pastel";
import { Etiquette } from "@/components/etiquette";
import { Icone } from "@/components/icone";
import { PanneauInfos } from "@/components/panneau-infos";
import {
  estExpiree,
  estNouvelle,
  infosAnnonce,
  libelleDocument,
  libellePublication,
  messageWhatsAppAnnonce,
  typesAnnonce,
} from "@/lib/annonces";
import { origine } from "@/lib/fiche-activite";
import {
  lienAnnonce,
  lireFicheAnnonce,
  lireSondageDeLIdentifiant,
  urlFichierAnnonce,
} from "@/lib/lecture-annonces";
import { lireSession } from "@/lib/session";
import { SondageAnnonce } from "../sondage-annonce";

type Props = { params: Promise<{ identifiant: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { identifiant } = await params;
  const annonce = await lireFicheAnnonce(identifiant);
  const metadataBase = new URL(await origine());
  if (!annonce) return { title: "Annonce introuvable", metadataBase };

  const description =
    [annonce.quand, annonce.lieu].filter(Boolean).join(" · ") ||
    annonce.texte?.slice(0, 160) ||
    typesAnnonce[annonce.type].libelle;
  return {
    title: annonce.titre,
    description,
    metadataBase,
    openGraph: {
      type: "website",
      siteName: "coMunity",
      locale: "fr_FR",
      title: annonce.titre,
      description,
      url: await lienAnnonce(identifiant),
    },
  };
}

export default async function PageAnnonce({ params }: Props) {
  const { identifiant } = await params;
  const annonce = await lireFicheAnnonce(identifiant);
  if (!annonce) notFound();

  const lien = await lienAnnonce(identifiant);
  const type = typesAnnonce[annonce.type];
  const infos = infosAnnonce(annonce);
  const expiree = estExpiree(annonce.expire_le);
  // Le lien est public, le sondage non : un visiteur lit l'annonce sans lui.
  const session = await lireSession();
  const sondage = session ? await lireSondageDeLIdentifiant(identifiant) : null;

  return (
    <EcranSecondaire
      retour={{ href: "/annonces", destination: "Annonces" }}
      partager={<BoutonPartager titre={annonce.titre} lien={lien} />}
    >
      {/* Sur ordinateur (cadre Journal), l'en-tête court sur toute la largeur, le texte et le
          sondage occupent la colonne de gauche, les infos et les boutons celle de droite. Les
          groupes n'ont pas de boîte sur mobile : l'ordre d'une seule colonne y reste le même. */}
      <article className="flex flex-col gap-[14px] desktop:grid desktop:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] desktop:grid-rows-[auto_auto_auto_1fr] desktop:items-start desktop:gap-x-12 desktop:gap-y-6">
        <div className="contents desktop:col-span-2 desktop:flex desktop:flex-col desktop:gap-[14px]">
          {annonce.photo_chemin && (
            // eslint-disable-next-line @next/next/no-img-element -- photo du bucket public, servie telle quelle
            <img
              src={urlFichierAnnonce(annonce.photo_chemin)}
              alt={`Photo de l'annonce : ${annonce.titre}`}
              className="max-h-[360px] w-full rounded-lg object-cover desktop:max-h-[440px]"
            />
          )}
          <div className="flex flex-wrap items-center gap-space-sm">
            <Etiquette ton={type.ton} icone={type.icone}>
              {type.libelle}
            </Etiquette>
            {estNouvelle(annonce.publiee_le) && !expiree && (
              <Etiquette>Nouveau</Etiquette>
            )}
          </div>
          <p className="text-body-md text-on-surface-variant">
            {libellePublication(annonce.publiee_le)}
          </p>
          <h1 className="font-headline text-headline-xl-mobile text-on-surface desktop:text-titre-journal">
            {annonce.titre}
          </h1>
          {expiree && (
            <EncartPastel>
              Cette annonce n&apos;est plus d&apos;actualité : elle a quitté la
              liste des annonces, mais son lien reste lisible.
            </EncartPastel>
          )}
        </div>
        {infos.length > 0 && (
          <div className="contents desktop:col-start-2 desktop:row-start-2 desktop:block">
            <PanneauInfos lignes={infos} />
          </div>
        )}
        <div className="contents desktop:col-start-1 desktop:row-span-3 desktop:row-start-2 desktop:flex desktop:flex-col desktop:gap-[14px]">
          {annonce.texte && (
            <BlocTexte titre="Détails">{annonce.texte}</BlocTexte>
          )}
          {sondage && (
            <SondageAnnonce
              lu={sondage}
              peutRepondre={session?.statut === "valide"}
            />
          )}
        </div>
        <div
          className={`contents desktop:col-start-2 desktop:flex desktop:flex-col desktop:gap-[14px] ${infos.length > 0 ? "desktop:row-start-3" : "desktop:row-start-2"}`}
        >
          {annonce.document_chemin && (
            <a
              href={urlFichierAnnonce(annonce.document_chemin)}
              target="_blank"
              rel="noopener noreferrer"
              className={classesBouton("contour")}
            >
              <Icone nom="description" />
              {libelleDocument(annonce.type)}
            </a>
          )}
          <BoutonRelayer message={messageWhatsAppAnnonce(annonce, lien)} />
          <BoutonCopier
            texte={lien}
            libelle="Copier le lien"
            confirmation="Lien copié"
          />
        </div>
      </article>
    </EcranSecondaire>
  );
}
