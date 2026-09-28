import Link from "next/link";
import { resumeEspace, type EspaceCommun } from "@/lib/espaces-communs";
import { classesBouton } from "./bouton";
import { EquipementsEspace } from "./equipements-espace";
import { Icone } from "./icone";

/**
 * Un espace commun dans la liste de l'espace syndic : carte de réglage bordée sans ombre, avec
 * sa pastille pêche, son nom, ses règles en une ligne, ses badges et le lien « Modifier ».
 */
export function CarteEspaceCommun({
  espace,
  href,
}: {
  espace: EspaceCommun;
  href: string;
}) {
  return (
    <li className="flex flex-col gap-space-sm rounded-lg border-[1.5px] border-bordure-carte bg-fond-carte p-4">
      <div className="flex items-start gap-space-sm">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-fond-action text-texte-action">
          <Icone nom="meeting_room" taille={24} />
        </span>
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="font-headline text-label-lg [overflow-wrap:anywhere] text-on-surface">
            {espace.nom}
          </span>
          <span className="text-body-md text-on-surface-variant">
            {resumeEspace(espace)}
          </span>
        </div>
        <Link href={href} className={classesBouton("fantome")}>
          <Icone nom="edit" taille={22} />
          Modifier
          <span className="sr-only"> : {espace.nom}</span>
        </Link>
      </div>
      <EquipementsEspace equipements={espace.equipements} />
    </li>
  );
}
