Menu « Espace syndic », sur **toutes** les pages de l'espace syndic, pour un membre actif du conseil syndical (spec #168). Une seule liste de rubriques sert au menu déplié, au rail et au tiroir, en trois groupes :

- **Suivi** : Tableau de bord (`monitoring`).
- **Résidence** : Résidents (`group`, avec le nombre de comptes en attente), Membres du syndic (`shield_person`), Modération (`visibility_off`, avec le nombre d'activités à relire).
- **Contenus** : Annonces (`campaign`), Espaces communs (`meeting_room`), Règlement intérieur (`menu_book`), Mon syndic (`support_agent`).

Ligne de rubrique : pilule de 52 px, pictogramme de 24 et libellé 17 px en 700, `on-surface-variant` ; survol `surface-container`. Rubrique courante : pilule pêche `--color-primary-fixed`, pictogramme plein, libellé en 800, `aria-current="page"` ; sur un formulaire, c'est la rubrique de sa liste. Compteur : pastille marine (`fond-syndic`, `texte-syndic`) au bout de la ligne, seulement s'il n'est pas nul ; le nom de la ligne le dit (« Résidents, 3 en attente », « Modération, 2 à relire »). Titre du groupe en `label-sm`, `on-surface-variant`.

**Trois états**, selon la largeur :

- **Dès 80 rem** (`--breakpoint-grand`) : menu déplié de 296 px (`--spacing-menu-syndic`), collé au bord gauche sous la barre du haut, fond `surface-container-low`, coins droits de 28 px, collant en haut quand la page défile (il défile sur lui-même s'il dépasse la fenêtre). En tête, « Espace syndic » (`headline-sm`) et le bouton rond « Réduire le menu » (`left_panel_close`). Le contenu, de 1152 px au plus (`--container-contenu-syndic`), se centre dans l'espace restant. « Réduire le menu » le passe en **rail** de 80 px (`--spacing-rail-syndic`) : pictogrammes seuls, centrés, titres de groupe remplacés par un filet, compteur en pastille sur le coin du pictogramme ; « Déplier le menu » (`left_panel_open`) le rouvre. Le choix est retenu dans le navigateur (stockage local, lu dans un `try`/`catch` ; sans lui, le menu est déplié) et posé avant le premier affichage : un menu réduit ne s'affiche jamais déplié d'abord.
- **De 64 à 80 rem** : rail par défaut. « Déplier le menu » ouvre le menu de 296 px **par-dessus** le contenu, avec l'ombre flottante, sans le pousser. Échap, un clic à côté, le choix d'une rubrique ou « Réduire le menu » le referment ; rien n'est retenu.
- **Sous 64 rem** : pas de barre latérale. `TiroirSyndic` : un bouton contour « Espace syndic » (pictogramme `menu`, nom accessible « Menu de l'espace syndic ») en tête de page ouvre un tiroir modal à gauche (320 px au plus, 88 % de la largeur), coins droits de 28 px, voile encre. Il se ferme par « Fermer » (nom accessible « Fermer le menu »), Échap, le voile ou le choix d'une rubrique ; le focus reste dans le tiroir puis revient au bouton. Un formulaire, sur mobile, reste un écran secondaire (barre de retour, barre d'action fixe) sans ce bouton.

Les pictogrammes du rail gardent leur nom, compteur compris. Transitions de `--duree-courte` sur `--ease-journal`, entrée du tiroir en glissement ; tout est coupé par `prefers-reduced-motion`. La barre d'action fixe d'un formulaire laisse libre la largeur du menu (`--largeur-menu-syndic`). Un compte non autorisé voit le refus de l'espace syndic, sans menu.

```jsx
<EcranSyndic rubrique="residents">…</EcranSyndic>                       {/* liste */}
<EcranSyndic rubrique="annonces" retour={{ href: "/syndic/annonces", destination: "Annonces" }} actionDansLeFormulaire>…</EcranSyndic>
```
