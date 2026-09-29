import type { ReactNode } from "react";
import Link from "next/link";
import {
  cheminAnnonce,
  estNouvelle,
  infosAnnonce,
  libelleDocument,
  libellePublication,
  messageWhatsAppAnnonce,
  typesAnnonce,
  type Annonce,
} from "@/lib/annonces";
import { BoutonRelayer } from "./bouton-relayer";
import { classesBouton } from "./bouton";
import { Etiquette } from "./etiquette";
import { Icone } from "./icone";

type Props = {
  annonce: Annonce;
  /** Le lien public de l'annonce, celui du message WhatsApp. */
  lien: string;
  /** L'adresse du PDF joint, quand l'annonce en a un. */
  urlDocument?: string;
  /** Le `Sondage` d'une annonce de type sondage, entre les infos et les boutons. */
  children?: ReactNode;
};

/**
 * Carte d'une annonce de la liste : une information à lire, jamais une activité, donc ni photo,
 * ni jauge, ni inscription. Ordre : pastille de type, « Nouveau », date de publication, titre,
 * texte, infos, sondage, boutons. Sur ordinateur (cadre Journal) : sans contour, ombre douce,
 * relevée au survol, et les boutons côte à côte.
 */
export function CarteAnnonce({ annonce, lien, urlDocument, children }: Props) {
  const type = typesAnnonce[annonce.type];
  const infos = infosAnnonce(annonce);
  return (
    <article className="relative flex flex-col gap-space-sm rounded-lg border-[1.5px] border-border-distinct/20 bg-surface-container-lowest p-space-md shadow-[0_3px_0_0_rgba(24,34,48,0.08)] desktop:survol-eleve desktop:gap-space-md desktop:border-transparent desktop:p-8 desktop:shadow-douce">
      <div className="flex flex-wrap items-center gap-space-sm">
        <Etiquette ton={type.ton} icone={type.icone}>
          {type.libelle}
        </Etiquette>
        {estNouvelle(annonce.publiee_le) && <Etiquette>Nouveau</Etiquette>}
      </div>
      <p className="text-body-md text-on-surface-variant">
        {libellePublication(annonce.publiee_le)}
      </p>
      <h2 className="font-headline text-headline-sm text-on-surface desktop:text-headline-lg">
        {/* Toute la carte ouvre l'annonce : le lien s'étend sur elle, les boutons restent au-dessus. */}
        <Link
          href={cheminAnnonce(annonce.identifiant_public)}
          className="after:absolute after:inset-0 after:rounded-lg"
        >
          {annonce.titre}
        </Link>
      </h2>
      {annonce.texte && (
        <p className="max-w-[65ch] text-body-lg whitespace-pre-line text-on-surface desktop:text-body-xl">
          {annonce.texte}
        </p>
      )}
      {infos.length > 0 && (
        <ul className="flex flex-col gap-space-xs">
          {infos.map((ligne) => (
            <li
              key={`${ligne.icone}-${ligne.titre}`}
              className="flex items-start gap-space-xs font-headline text-body-bold text-on-surface"
            >
              <span className="text-texte-date">
                <Icone nom={ligne.icone} taille={26} />
              </span>
              {ligne.titre}
            </li>
          ))}
        </ul>
      )}
      {/* Le sondage se répond dans la carte : il reste au-dessus du lien qui l'étend. */}
      {children && <div className="relative z-10">{children}</div>}
      <div className="relative z-10 flex flex-col gap-space-sm desktop:flex-row desktop:flex-wrap">
        {urlDocument && (
          <a
            href={urlDocument}
            target="_blank"
            rel="noopener noreferrer"
            className={classesBouton("contour")}
          >
            <Icone nom="description" />
            {libelleDocument(annonce.type)}
          </a>
        )}
        <BoutonRelayer message={messageWhatsAppAnnonce(annonce, lien)} />
      </div>
    </article>
  );
}
