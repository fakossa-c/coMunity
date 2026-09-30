import {
  initialeFiche,
  lienEmail,
  lienTelephone,
  nomFiche,
} from "@/lib/fiche-syndic";
import type { FicheAvecPhoto } from "@/lib/lecture-fiches-syndic";
import { Avatar } from "./avatar";
import { classesBouton } from "./bouton";
import { Etiquette } from "./etiquette";
import { Icone } from "./icone";

const LIEN_COORDONNEE =
  "justify-start! text-left [overflow-wrap:anywhere] " +
  classesBouton("contour", true);

/** Bouton « Appeler » ou « Écrire » de la carte sur ordinateur : 56 px, contour, pleine largeur. */
const BOUTON_CONTACT = classesBouton("contour", true);

/**
 * La fiche d'une personne du syndic dans Mon syndic : photo (ou initiale), prénom et nom, la
 * mention « Sur coMunity » quand elle a un compte actif, puis son téléphone et son e-mail en
 * liens d'appel et d'envoi de mail, quand ils sont renseignés. Sur mobile : bordure sans ombre,
 * les coordonnées sont les liens eux-mêmes. Sur ordinateur (cadre Journal) : sans contour, ombre
 * douce relevée au survol, les coordonnées en clair puis les boutons « Appeler » et « Écrire ».
 */
export function CarteFicheSyndic({ fiche }: { fiche: FicheAvecPhoto }) {
  const nom = nomFiche(fiche);
  return (
    <li className="flex survol-eleve flex-col gap-space-md rounded-lg border-[1.5px] border-bordure-carte bg-fond-carte p-4 desktop:p-8">
      <div className="flex items-center gap-space-md">
        <Avatar
          initiale={initialeFiche(fiche)}
          taille={72}
          photo={fiche.photo_url ?? undefined}
        />
        <div className="flex min-w-0 flex-col items-start gap-space-xs">
          <h2 className="font-headline text-headline-sm [overflow-wrap:anywhere] text-on-surface desktop:text-headline-lg">
            {nom}
          </h2>
          {fiche.sur_comunity && (
            <Etiquette ton="vert" icone="check_circle">
              Sur coMunity
            </Etiquette>
          )}
        </div>
      </div>
      {(fiche.telephone || fiche.email) && (
        <ul
          aria-label={`Contacter ${nom}`}
          className="flex flex-col gap-space-sm desktop:hidden"
        >
          {fiche.telephone && (
            <li>
              <a
                href={lienTelephone(fiche.telephone)}
                className={LIEN_COORDONNEE}
              >
                <Icone nom="call" taille={24} />
                {fiche.telephone}
                <span className="sr-only"> : appeler {nom}</span>
              </a>
            </li>
          )}
          {fiche.email && (
            <li>
              <a href={lienEmail(fiche.email)} className={LIEN_COORDONNEE}>
                <Icone nom="mail" taille={24} />
                {fiche.email}
                <span className="sr-only"> : écrire à {nom}</span>
              </a>
            </li>
          )}
        </ul>
      )}
      {(fiche.telephone || fiche.email) && (
        <div className="hidden flex-col gap-space-md desktop:flex">
          <ul className="flex flex-col gap-space-sm text-body-lg text-on-surface-variant">
            {fiche.telephone && (
              <li className="flex items-center gap-space-sm">
                <Icone nom="call" taille={24} />
                {fiche.telephone}
              </li>
            )}
            {fiche.email && (
              <li className="flex items-center gap-space-sm [overflow-wrap:anywhere]">
                <Icone nom="mail" taille={24} />
                {fiche.email}
              </li>
            )}
          </ul>
          <div className="flex flex-col gap-space-sm">
            {fiche.telephone && (
              <a
                href={lienTelephone(fiche.telephone)}
                className={BOUTON_CONTACT}
              >
                <Icone nom="call" taille={24} />
                Appeler
                <span className="sr-only">
                  {" "}
                  {nom}, {fiche.telephone}
                </span>
              </a>
            )}
            {fiche.email && (
              <a href={lienEmail(fiche.email)} className={BOUTON_CONTACT}>
                <Icone nom="mail" taille={24} />
                Écrire
                <span className="sr-only">
                  {" "}
                  à {nom}, {fiche.email}
                </span>
              </a>
            )}
          </div>
        </div>
      )}
    </li>
  );
}
