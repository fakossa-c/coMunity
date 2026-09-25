/**
 * @startingPoint section="Cartes" subtitle="Carte d'activité : photo, catégorie, date, jauge, badges, actions" viewport="700x760"
 */
export interface CarteActiviteProps {
  /** Légende de l'emplacement photo, ou { src } pour une vraie image. Absente dans « Mes activités » */
  photo?: string | { src: string };
  categorie?: { nom: string; icone: string };
  /** "Samedi 24 oct. à 16h00". Omettre quand les cartes sont regroupées par jour */
  date?: string;
  /** "Martine.B" → affiché « par Martine.B » */
  auteur?: string;
  titre: string;
  lieu?: string;
  /** "de 16h00 à 18h30" : affiché dans les détails dépliables */
  horaire?: string;
  /** Range horaire, lieu et étiquettes dans une rubrique « Détails » dépliable (vert → Accessibilité, autres → Pour qui) */
  detailsDepliables?: boolean;
  inscrits?: number;
  places?: number;
  /** À FAIRE : les valeurs des étiquettes (accessibilité, pour qui…) seront des enums à définir.
   *  En attendant, texte libre ; ton vert → rangée « Accessibilité », autres → « Pour qui ». */
  etiquettes?: { ton?: "vert" | "abricot" | "peche"; icone?: string; libelle: string }[];
  /** Bandeau marine « Proposée par le syndic » en tête. Abandonné le 25/09/2026 : une activité
   *  du syndic se présente comme celle d'un voisin. */
  syndic?: boolean;
  /** Bandeau vert d'inscription ("Inscrite, avec 2 personnes") */
  statut?: string;
  /** Déduit : "inscrit" si statut, "aucune" si syndic, sinon "participer" */
  actions?: "participer" | "inscrit" | "aucune";
  onDetails?: () => void;
  onParticiper?: () => void;
  onAnnuler?: () => void;
}
export declare function CarteActivite(props: CarteActiviteProps): JSX.Element;
