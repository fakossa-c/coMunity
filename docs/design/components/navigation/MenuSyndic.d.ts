/**
 * @startingPoint section="Navigation" subtitle="Menu de l'espace syndic : déplié, rail ou tiroir" viewport="1440x900"
 */
export interface MenuSyndicProps {
  /** Rubrique courante ; sur un formulaire, celle de sa liste */
  actif:
    | "tableau-de-bord"
    | "residents"
    | "membres"
    | "moderation"
    | "annonces"
    | "espaces-communs"
    | "reglement"
    | "mon-syndic";
  /** Comptes en attente (`residents`) et activités à relire (`moderation`) ; une pastille n'apparaît que si le nombre n'est pas nul */
  compteurs: { residents?: number; moderation?: number };
}
/** Barre latérale sur ordinateur : dépliée dès 80 rem, rail de 64 à 80 rem */
export declare function MenuSyndic(props: MenuSyndicProps): JSX.Element;
/** Bouton « Espace syndic » et tiroir à gauche, sous 64 rem */
export declare function TiroirSyndic(props: MenuSyndicProps): JSX.Element;
