export interface ApercuActiviteProps {
  /** Titre saisi ; vide, « Le titre de votre activité » en italique */
  titre: string;
  categorie: "moments_partages" | "creation_bricolage" | "culture_loisirs" | "entraide_partage" | "jardin_nature";
  /** Pictogramme de l'activité, à défaut celui de la catégorie */
  pictogramme: string;
  /** Description saisie ; vide, un texte d'attente en italique. Trois lignes au plus */
  description: string;
  /** « Samedi 24 octobre · De 16h00 à 18h30 », ou « Date et heure à choisir » */
  creneau: string;
  /** Lieu choisi ; "" : « Lieu à choisir » */
  lieu: string;
  /** « Jusqu'à 12 personnes · confirmée dès 4 » */
  places: string;
  etiquettes: string[];
  /** Adresse de la première photo ; absente, le pictogramme tient lieu de photo */
  photo?: string | null;
}
export declare function ApercuActivite(props: ApercuActiviteProps): JSX.Element;
