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

const LIEN =
  "justify-start! text-left [overflow-wrap:anywhere] " +
  classesBouton("contour", true);

/**
 * La fiche d'une personne du syndic dans Mon syndic : photo (ou initiale), prénom et nom, la
 * mention « Sur coMunity » quand elle a un compte actif, puis son téléphone et son e-mail en
 * liens d'appel et d'envoi de mail, quand ils sont renseignés. Bordure sans ombre : on la lit.
 */
export function CarteFicheSyndic({ fiche }: { fiche: FicheAvecPhoto }) {
  const nom = nomFiche(fiche);
  return (
    <li className="flex flex-col gap-space-md rounded-lg border-[1.5px] border-bordure-carte bg-fond-carte p-4">
      <div className="flex items-center gap-space-md">
        <Avatar
          initiale={initialeFiche(fiche)}
          taille={72}
          photo={fiche.photo_url ?? undefined}
        />
        <div className="flex min-w-0 flex-col items-start gap-space-xs">
          <h2 className="font-headline text-headline-sm [overflow-wrap:anywhere] text-on-surface">
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
          className="flex flex-col gap-space-sm"
        >
          {fiche.telephone && (
            <li>
              <a href={lienTelephone(fiche.telephone)} className={LIEN}>
                <Icone nom="call" taille={24} />
                {fiche.telephone}
                <span className="sr-only"> : appeler {nom}</span>
              </a>
            </li>
          )}
          {fiche.email && (
            <li>
              <a href={lienEmail(fiche.email)} className={LIEN}>
                <Icone nom="mail" taille={24} />
                {fiche.email}
                <span className="sr-only"> : écrire à {nom}</span>
              </a>
            </li>
          )}
        </ul>
      )}
    </li>
  );
}
