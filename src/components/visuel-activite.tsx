import { couleurDe, type CategorieActivite } from "@/lib/categories-activite";
import { EmplacementPhoto } from "./emplacement-photo";
import { Icone } from "./icone";
import type { NomIcone } from "./icones";

type Props = {
  pictogramme: NomIcone;
  /** Sans photo, le visuel prend le pastel de cette catégorie. */
  categorie: CategorieActivite;
  /** L'adresse de la première photo de l'activité : elle prend la place du pictogramme. */
  photo?: string | null;
  /** En haut d'une carte de l'Accueil : 128 px, sans arrondi (la carte arrondit ses coins). */
  enCarte?: boolean;
  /** Bloc « À la une » : 192 px sur mobile et le pictogramme plus grand, toute la hauteur du bloc sur ordinateur. */
  grand?: boolean;
  /** Tête de fiche sans photo : 280 px de haut et le pictogramme de 144 px sur ordinateur, 150 px sur mobile. */
  enTeteDeFiche?: boolean;
};

/**
 * En haut d'une carte ou d'une fiche : la première photo de l'activité, à défaut son pictogramme.
 * La carte porte déjà le titre de l'activité : la photo y est décorative.
 */
export function VisuelActivite({
  pictogramme,
  categorie,
  photo,
  enCarte = false,
  grand = false,
  enTeteDeFiche = false,
}: Props) {
  if (photo)
    return (
      <EmplacementPhoto
        src={photo}
        arrondi={!enCarte}
        className={
          grand ? "h-48! desktop:h-full! desktop:min-h-[21.75rem]!" : undefined
        }
      />
    );
  const { fond, encre } = couleurDe(categorie);
  return (
    <div
      className={`flex items-center justify-center ${fond} ${encre} ${
        grand
          ? "h-48 desktop:h-full desktop:min-h-[21.75rem]"
          : enCarte
            ? "h-32"
            : enTeteDeFiche
              ? "h-[150px] rounded-lg desktop:h-[17.5rem]"
              : "h-[150px] rounded-lg"
      }`}
    >
      <Icone
        nom={pictogramme}
        className={
          grand
            ? "size-24 desktop:size-40"
            : enCarte
              ? "size-16"
              : enTeteDeFiche
                ? "size-20 desktop:size-36"
                : "size-20"
        }
      />
    </div>
  );
}
