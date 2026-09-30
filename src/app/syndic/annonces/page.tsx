import type { Metadata } from "next";
import Link from "next/link";
import { classesBouton } from "@/components/bouton";
import { EcranSecondaire, EcranSyndic } from "@/components/cadre";
import { Etiquette } from "@/components/etiquette";
import { Annonce as Confirmation } from "@/components/formulaire";
import { Icone } from "@/components/icone";
import { TitrePage } from "@/components/titre-page";
import { TitreSection } from "@/components/titre-section";
import {
  cheminAnnonce,
  dateSansJour,
  estExpiree,
  estNouvelle,
  infosAnnonce,
  libellePublication,
  typesAnnonce,
} from "@/lib/annonces";
import { lireToutesLesAnnonces } from "@/lib/lecture-annonces";
import { accesSyndic, RETOUR_ACCUEIL } from "../acces";
import { ActionsAnnonce } from "./actions-annonce";

export const metadata: Metadata = { title: "Annonces du conseil syndical" };

type Props = {
  searchParams: Promise<{ fait?: string; titre?: string }>;
};

const CONFIRMATIONS: Record<string, (titre: string) => string> = {
  publiee: (titre) => `« ${titre} » est publiée.`,
  enregistree: (titre) => `« ${titre} » est enregistrée.`,
  supprimee: (titre) => `« ${titre} » est supprimée.`,
};

export default async function AnnoncesDuSyndic({ searchParams }: Props) {
  const { refus } = await accesSyndic("/syndic/annonces");
  if (refus)
    return <EcranSecondaire retour={RETOUR_ACCUEIL}>{refus}</EcranSecondaire>;

  const { fait, titre } = await searchParams;
  const annonces = await lireToutesLesAnnonces();
  const confirmation = fait && titre ? CONFIRMATIONS[fait]?.(titre) : undefined;

  return (
    <EcranSyndic rubrique="annonces">
      <div className="desktop:flex desktop:items-start desktop:justify-between desktop:gap-8">
        <TitrePage
          titre="Annonces"
          sousTitre="Assemblées, travaux, sondages et infos pratiques pour les résidents."
        />
        {/* Sur ordinateur, le bouton d'ajout est en tête ; sur mobile, il reste sous la liste. */}
        <div className="hidden shrink-0 desktop:mt-2.5 desktop:block">
          <Link
            href="/syndic/annonces/nouvelle"
            className={classesBouton("action")}
          >
            <Icone nom="add" taille={24} />
            Nouvelle annonce
          </Link>
        </div>
      </div>
      <div className="flex flex-col gap-space-lg">
        <Confirmation message={confirmation} />

        <section className="flex flex-col gap-space-sm">
          <TitreSection>
            {annonces.length === 0
              ? "Aucune annonce"
              : annonces.length === 1
                ? "1 annonce"
                : `${annonces.length} annonces`}
          </TitreSection>
          {annonces.length === 0 ? (
            <p className="text-body-lg text-on-surface-variant">
              Publiez une première annonce : les résidents la liront dans
              l&apos;onglet Annonces.
            </p>
          ) : (
            <ul
              aria-label="Annonces publiées"
              className="flex flex-col gap-space-md desktop:grid desktop:grid-cols-2 desktop:gap-x-8 desktop:gap-y-6"
            >
              {annonces.map((annonce) => {
                const type = typesAnnonce[annonce.type];
                const expiree = estExpiree(annonce.expire_le);
                const infos = infosAnnonce(annonce);
                return (
                  <li
                    key={annonce.id}
                    className="flex flex-col gap-space-sm rounded-lg border-[1.5px] border-border-distinct/20 bg-surface-container-lowest p-space-md shadow-[0_3px_0_0_rgba(24,34,48,0.08)] desktop:border-transparent desktop:p-8 desktop:shadow-douce"
                  >
                    <div className="flex flex-wrap items-center gap-space-sm">
                      <Etiquette ton={type.ton} icone={type.icone}>
                        {type.libelle}
                      </Etiquette>
                      {annonce.epinglee && (
                        <Etiquette icone="keep">Épinglée</Etiquette>
                      )}
                      {estNouvelle(annonce.publiee_le) && (
                        <Etiquette>Nouveau</Etiquette>
                      )}
                      {expiree && (
                        <Etiquette ton="erreur" icone="event_busy">
                          Expirée
                        </Etiquette>
                      )}
                    </div>
                    <p className="text-body-md text-on-surface-variant">
                      {libellePublication(annonce.publiee_le)}
                      {annonce.expire_le &&
                        ` · ${expiree ? "a quitté" : "quitte"} la liste après le ${dateSansJour(annonce.expire_le)}`}
                    </p>
                    <h3 className="font-headline text-headline-sm text-on-surface">
                      {annonce.titre}
                    </h3>
                    {infos.length > 0 && (
                      <p className="text-body-lg text-on-surface-variant">
                        {infos.map((ligne) => ligne.titre).join(" · ")}
                      </p>
                    )}
                    <Link
                      href={cheminAnnonce(annonce.identifiant_public)}
                      className="inline-flex min-h-cible items-center gap-1.5 self-start font-headline text-label-lg text-primary underline"
                    >
                      <Icone nom="visibility" taille={22} />
                      Voir l&apos;annonce
                      <span className="sr-only"> : {annonce.titre}</span>
                    </Link>
                    <div className="desktop:mt-auto">
                      <ActionsAnnonce
                        id={annonce.id}
                        titre={annonce.titre}
                        epinglee={annonce.epinglee}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
          <div className="desktop:hidden">
            <Link
              href="/syndic/annonces/nouvelle"
              className={classesBouton("action", true)}
            >
              <Icone nom="add" taille={24} />
              Publier une annonce
            </Link>
          </div>
        </section>
      </div>
    </EcranSyndic>
  );
}
