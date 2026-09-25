# coMunity · Warm Commons 2a

Design system de **coMunity**, l'app de vie d'une résidence : activités entre voisins, annonces du syndic, profil. Tiré de la direction **2a « Le hall accueillant · tout en primary »**, puis enrichi par le projet de maquettes (nouvelles pages, en-têtes, cartes, menu du profil).

## Sources
- Projet de maquettes `50030f8b-d815-4f0c-8272-83874317cc7f` : `ui_kits/app-resident/` (12 écrans) et ses composants. C'est la référence la plus récente.
- `Directions visuelles.dc.html`, Tour 2, option `#2a` (même projet) : l'origine des fondations.
- Logo : `uploads/logo coMunity.png`, détouré dans `assets/`.

## Contexte produit
Une app par résidence. Les voisins proposent des activités, s'y inscrivent en un geste et se retrouvent ; le syndic publie ses annonces (assemblées, sondages, travaux). Public intergénérationnel avec beaucoup de personnes âgées (personne de référence : Danielle, 74 ans, 2e étage). Mobile d'abord. Ce qu'on doit ressentir : le panneau d'affichage d'un hall bien tenu, pas un logiciel de gestion.

## Contenu et ton
- Français, vouvoiement, mots de voisin : « Je participe », « 4 places restantes », « Ce que vous pouvez apporter », « Venez comme vous êtes ».
- Accueil personnel : « Bonjour Danielle ! », suivi de l'adresse (« Bât. B, 2e étage. »).
- Dates longues et lisibles : « Samedi 24 oct. à 16h00 », « De 16h00 à 18h30 ». Dans l'Accueil, le jour devient intertitre (« Aujourd’hui », « Mardi 27 octobre ») et la carte ne garde que l'horaire.
- Statuts explicites et accordés : « Inscrite, avec 2 personnes ». L'origine se dit : « Initiative de résident », « Publiée le 20 oct. par le syndic ». Une activité du syndic se présente comme celle d'un voisin (décision du 25/09/2026).
- Confidentialité dite en clair : « Les voisins voient votre pseudo, prénom et bâtiment. » Actions irréversibles expliquées avant confirmation (« Cette action est définitive. »), avec une sortie évidente (« Garder mon compte »).
- Libellé du retour = destination ou effet : « Retour », « Profil », « Annuler ».
- Casse phrase partout, pas de majuscules décoratives, pas d'emoji. Espace insécable avant « ! ».

## Marque
Logo officiel : mot-symbole « coMunity », le M formé de deux mains qui se serrent, terre cuite `--color-marque-terre` (#c4580a) et menthe `--color-marque-menthe` (#9fecb5). Composant `<Logo />` (image embarquée, deux variantes : `couleur` sur fond clair, `inverse` blanc + menthe sur terre cuite ou marine). Hauteur 24 px dans l'en-tête, 16 px minimum. Fichiers : `assets/logo.png`, `assets/logo-inverse.png`, `assets/symbole.png` (le M seul, icône d'app). Ne pas redessiner, recolorer ni déformer le logo. Les deux couleurs de marque ne servent pas à l'interface : la terre cuite d'interface reste `--color-primary` (#8f2b00, plus sombre, lisible sur blanc).

## Fondations visuelles
- **Couleurs.** Fond de page bleuté très clair (`--color-surface` #f8f9ff), cartes blanches. Les actions sont en **pastels** : pêche `--color-primary-fixed` (#ffdbd0) pour agir (bouton principal, puce sélectionnée, onglet actif de la barre, pastilles catégorie/menu, encart « À savoir », type AG) et son contour `--color-primary-fixed-dim` (#ffb59c) sur les boutons secondaires ; vert `--color-secondary-fixed` pour confirmer (statut inscrit, badge accessibilité, bouton flottant, types travaux/info), `-container` pour « Visible », `-dim` pour la jauge et les résultats de sondage ; abricot `--color-tertiary-fixed` pour les badges familles et le type sondage. Texte sur pastel : toujours l'encre `on-*-fixed` correspondante. La terre cuite `--color-primary` n'est jamais un fond (sauf bouton rond actif) : dates, pictos de catégorie, « Aujourd’hui », contour de l'option de sondage choisie. Marine `--color-inverse-surface` : bandeau syndic et avatar de la personne connectée. Rouge `--color-error` : « Annuler », « Supprimer mon compte ».
- **Typographie.** Plus Jakarta Sans (700/800) pour titres, dates, libellés et boutons ; Atkinson Hyperlegible Next pour le texte, 18 px minimum (16 px pour les mentions secondaires). Titres de page 28/36 800, intertitres 19 px 800, titres de carte 22/28 700, dates 17 px 700 terre cuite.
- **Thème sombre.** `data-theme="sombre"` sur la racine de l'app (`tokens/theme-sombre.css`). Il redéfinit toutes les couleurs, alias et ombres : les composants n'ont rien à changer tant qu'ils passent par les tokens.
- **Grands caractères.** `data-taille="grands"` sur la racine de l'app multiplie les tailles par 1,25 (interlignage 1,4) via les tokens de `tokens/typography.css`. Tout texte doit donc passer par les variables `--text-*`, jamais par des px en dur.
- **Espacements.** Marge de page 20 px, 20 px entre cartes et entre champs, 28 px entre deux jours, 10 px entre puces et boutons côte à côte, padding de carte 16 px (16/16/18 sous une photo), gap interne 10 px.
- **Formes.** Tout ce qui se touche seul est en **pilule** (`--radius-full`) : boutons, puces, badges, bouton flottant, pastilles. Cartes, encarts, entrées de menu, photo de fiche : 16 px. Champs, cases de choix, options de sondage, bandeau de statut : 12 px. Feuille du bas : 28 px en haut.
- **Cartes.** Fond blanc, bordure 1,5 px `rgba(45,49,46,.18)`, rayon 16, **ombre plate** `0 3px 0 0 rgba(24,34,48,.08)` pour les cartes de contenu (activité, annonce). Les cartes de réglage (`CarteLignes`, `LigneMenu`, `PanneauInfos`) gardent la bordure sans l'ombre.
- **Élévation.** Ombre plate pour les cartes ; ombre diffuse pour le bouton flottant ; ombre inversée pour la barre d'action fixe. Pas d'ombre sur la barre de navigation : un filet de 1,5 px. La feuille du bas se détache par un voile encre à 40 %.
- **Images.** Photos réelles des activités ; en maquette, emplacement rayé à 135° avec légende monospace.
- **États.** Sélection = passage au pêche plein + coche (ou pastille radio). Onglet actif = pictogramme plein + pilule pêche + graisse 800. Choix segmenté actif = case blanche bordée, icône pleine. Désactivé = opacité 50 %. Focus = anneau 3 px `--color-focus`.
- **Mouvement.** Seulement fonctionnel : la feuille du bas monte en 0,3 s `cubic-bezier(.2,.8,.2,1)`, le voile en 0,25 s. Pas de transparence ni de flou décoratifs, pas de dégradé.

## Écrans et en-têtes
Chaque écran est un `Ecran` : une zone qui défile, une barre fixe en bas. L'avatar marine est présent partout et ouvre le `MenuProfil`.
- **Accueil** : `EnTeteResidence` (logo, résidence, avatar) et `Salutation` défilent ; `BarreFiltres` **colle** ; activités groupées par jour sous un `TitreSection`, cartes à détails dépliables ; `BarreNavigation` fixe.
- **Activités** : `EnTeteResidence`, `TitrePage` défilent ; `Onglets` + `BarreFiltres variante="liste"` **collent** ensemble ; `BoutonFlottant` fixe ; `BarreNavigation` fixe.
- **Annonces** : `EnTeteResidence`, `TitrePage` défilent ; `BarreFiltres` **colle** ; `CarteAnnonce` (dont `Sondage`) ; `BarreNavigation` fixe.
- **Fiche** : `BarreRetour` (Retour, Partager, avatar) **colle** ; `BarreActionFixe` (compteur + CTA) fixe. Réserve basse 170 px.
- **Profil et rubriques** : `BarreRetour` sans Partager (« Profil » dans les rubriques) ; `EnTeteProfil` + `LigneMenu` ; pas de barre en bas. Réserve basse 40 px.
- **Formulaires** : `BarreRetour libelleRetour="Annuler"` ; `Champ` empilés ; `BarreActionFixe` avec « Enregistrer » pleine largeur.
- **Menu du profil** : feuille du bas au-dessus de tout (Profil, Mon syndic, Ma copro, Fermer).
Règle : toute barre de filtres colle en haut, avec les onglets qui la précèdent.

## Iconographie
Material Symbols Rounded (`opsz 24, wght 500, FILL 0..1`), via `<Icone nom="…" />`. Glyphe plein uniquement pour l'onglet actif, le choix segmenté actif et `check_circle`. Toujours accompagné d'un texte. Tailles : 20 badge/visibilité, 22 puce/catégorie, 24 défaut/lignes, 26 infos/nav/menu, 28 retour/flottant. Pictos récurrents : `celebration`, `potted_plant` (catégories) ; `groups`, `how_to_vote`, `construction`, `campaign` (annonces) ; `key`, `badge`, `interests`, `tune` (profil) ; `person`, `support_agent`, `apartment` (menu). Pas d'emoji.

## Index
- `styles.css` → `tokens/` (fonts, colors, typography, spacing, elevation, base)
- `components/`
  - general : Icone, TitrePage, TitreSection
  - actions : Bouton (action, contour, danger, fantome), BoutonRond, BoutonFlottant, Compteur
  - filtres : PuceFiltre, BarreFiltres
  - badges : Etiquette, StatutInscription
  - donnees : Jauge, Sondage
  - medias : EmplacementPhoto
  - identite : Logo, Avatar, EnTeteResidence, EnTeteProfil, ProposePar, Salutation
  - cartes : CarteActivite, CarteAnnonce, CarteLignes, PanneauInfos, EncartPastel, BlocTexte
  - navigation : BarreNavigation, Onglets, BarreRetour, BarreActionFixe, LigneMenu, MenuProfil
  - formulaires : Champ, ChoixSegmente, ChoixEtiquettes, BoutonVisibilite
  - structure : Ecran
- `assets/` : logo, logo inversé, symbole
- `guidelines/` : cartes de fondations + `charger-ds.js`
- `ui_kits/app-resident/` : l'app cliquable (12 écrans + menu)
- `SKILL.md`

## Étiquettes d'activité
Deux listes fermées (décision du 24/09/2026, ticket #9) : Accessibilité (Accès plain-pied, Ascenseur, Chaises prévues, Sièges confortables, Ambiance calme), en vert ; Pour qui (Enfants bienvenus, Tous âges, Animaux acceptés), en abricot. Cochées avec `ChoixEtiquettes`, affichées avec `Etiquette` sur la carte et la fiche.

## Ouvert
- Thème sombre : le choix existe dans Mes réglages, pas encore les couleurs.
- Non maquettés : J'organise, Passées, Mon syndic, Ma copro, Mes intérêts.
