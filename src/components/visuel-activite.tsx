import { EmplacementPhoto } from "./emplacement-photo";
import { Icone } from "./icone";
import type { NomIcone } from "./icones";

type Props = {
  pictogramme: NomIcone;
  /** L'adresse de la première photo de l'activité : elle prend la place du pictogramme. */
  photo?: string | null;
  /** En haut d'une carte de l'Accueil : 128 px, sans arrondi (la carte arrondit ses coins). */
  enCarte?: boolean;
};

/**
 * En haut d'une carte ou d'une fiche : la première photo de l'activité, à défaut son pictogramme.
 * La carte porte déjà le titre de l'activité : la photo y est décorative.
 */
export function VisuelActivite({ pictogramme, photo, enCarte = false }: Props) {
  if (photo) return <EmplacementPhoto src={photo} arrondi={!enCarte} />;
  return (
    <div
      className={`flex items-center justify-center bg-fond-action text-texte-action ${
        enCarte ? "h-32" : "h-[150px] rounded-lg"
      }`}
    >
      <Icone nom={pictogramme} className={enCarte ? "size-16" : "size-20"} />
    </div>
  );
}
