import { categoriesActivite, couleurDe } from "@/lib/categories-activite";
import type { CategorieActivite } from "@/lib/categories-activite";
import type { EtiquetteActivite } from "@/lib/etiquettes-activite";
import { EtiquettesActivite } from "./etiquette";
import { Icone } from "./icone";
import type { NomIcone } from "./icones";
import { VisuelActivite } from "./visuel-activite";

type Props = {
  titre: string;
  categorie: CategorieActivite;
  pictogramme: NomIcone;
  description: string;
  /** « Samedi 24 octobre · De 16h00 à 18h30 », ou ce qu'il reste à choisir. */
  creneau: string;
  /** `""` avant tout choix. */
  lieu: string;
  /** « Jusqu'à 12 personnes · confirmée dès 4 ». */
  places: string;
  etiquettes: EtiquetteActivite[];
  /** L'adresse de la première photo choisie ; absente, le pictogramme tient lieu de photo. */
  photo?: string | null;
};

const TITRE_VIDE = "Le titre de votre activité";
const DESCRIPTION_VIDE = "La description de votre activité apparaîtra ici.";

/**
 * Aperçu vivant de la carte d'une activité, dans la colonne de droite de Proposer : la catégorie
 * et ses couleurs, la photo de couverture ou le pictogramme, le jour et l'horaire, le titre, la
 * description, le lieu, les places et les étiquettes, tels qu'ils suivent la saisie. Sans lien ni
 * bouton : c'est une image de ce que verront les voisins, pas une carte à ouvrir. Elle reprend les
 * éléments de la carte de l'Accueil (visuel, pastille de catégorie, jour en terre cuite).
 */
export function ApercuActivite({
  titre,
  categorie,
  pictogramme,
  description,
  creneau,
  lieu,
  places,
  etiquettes,
  photo,
}: Props) {
  const couleur = couleurDe(categorie);
  return (
    <article
      aria-label="Aperçu de la carte de l'activité"
      className="flex flex-col overflow-hidden rounded-lg border-[1.5px] border-bordure-carte bg-fond-carte shadow-carte"
    >
      <VisuelActivite
        pictogramme={pictogramme}
        categorie={categorie}
        photo={photo}
        enCarte
      />
      <div className="flex flex-col gap-space-sm px-4 pt-4 pb-[18px]">
        <p className="flex items-center gap-1.5 text-body-md text-on-surface-variant">
          <span
            className={`flex size-9 shrink-0 items-center justify-center rounded-full ${couleur.fond} ${couleur.encre}`}
          >
            <Icone nom={pictogramme} taille={22} />
          </span>
          {categoriesActivite[categorie].libelle}
        </p>
        <p className="font-headline text-label-lg text-texte-date">{creneau}</p>
        <p
          className={`font-headline text-headline-md ${titre ? "text-on-surface" : "text-on-surface-variant italic"}`}
        >
          {titre || TITRE_VIDE}
        </p>
        <p
          className={`line-clamp-3 text-body-lg break-words text-on-surface-variant ${description ? "" : "italic"}`}
        >
          {description || DESCRIPTION_VIDE}
        </p>
        <p className="flex items-center gap-space-xs text-body-lg text-on-surface-variant">
          <Icone nom="location_on" className="size-5 shrink-0" />
          {lieu || "Lieu à choisir"}
        </p>
        <p className="flex items-center gap-space-xs text-body-lg text-on-surface-variant">
          <Icone nom="group" className="size-5 shrink-0" />
          {places}
        </p>
        <EtiquettesActivite etiquettes={etiquettes} />
      </div>
    </article>
  );
}
