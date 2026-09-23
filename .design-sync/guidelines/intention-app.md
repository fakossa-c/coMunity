# coMunity : intention de l'app

À lire avant de dessiner un écran. Ce guide dit pour qui l'app existe, ce qu'elle doit faire ressentir et comment elle s'organise. La charte visuelle (couleurs, typographie, espacements, composants) est dans `warm-commons.md`.

## Le problème

Dans une copropriété, la vie collective passe par deux canaux qui fonctionnent mal ensemble :

- les outils du syndic, austères et administratifs (factures, procès-verbaux d'assemblée générale) ;
- le groupe WhatsApp des résidents, vite chaotique : une proposition d'atelier ou de goûter s'y noie sous les messages, on ne sait plus qui vient, où, à quelle heure, ni quoi apporter.

## La promesse

Une app propre à **une seule résidence**, où les voisins proposent des activités, s'y inscrivent en un geste et se retrouvent. Le syndic y publie ses annonces et voit ce qui anime la résidence.

Ce que l'app doit faire ressentir : la chaleur d'un panneau d'affichage de hall d'immeuble bien tenu, pas un logiciel de gestion. On doit s'y sentir attendu (« Bonjour Danielle ! »), jamais perdu.

## Pour qui

- **Les résidents**, sur mobile d'abord. Public intergénérationnel : de jeunes actifs, des familles, et beaucoup de personnes âgées, parfois malvoyantes ou peu à l'aise avec le numérique. La personne de référence : Danielle, 74 ans, 2e étage, passionnée de jardinage et de lecture.
- **Le syndic**, sur ordinateur d'abord : il publie les annonces, valide les nouveaux résidents, modère, gère les lieux et suit un tableau de bord.
- **Le visiteur non connecté**, qui ouvre un lien reçu sur WhatsApp : il voit la fiche d'une activité (sans le nom des inscrits) et peut s'inscrire après connexion.

## Principes de conception

1. **L'essentiel d'un coup d'œil.** Chaque écran répond à une question, et la réponse est visible sans faire défiler : quoi, quand, où, combien de places. Pas d'introduction de trois lignes, pas de structure qui repousse l'essentiel sous la ligne de flottaison.
2. **Une action principale par écran**, évidente et atteignable au pouce (« Je participe », « Publier »).
3. **Lisible par tous** : WCAG AAA visé, texte courant de 18 à 20 px, cibles tactiles d'au moins 52 × 52 px, contraste fort, anneau de focus visible. Pas d'information portée par la seule couleur ; une icône est toujours accompagnée d'un texte.
4. **Des mots simples**, ceux d'un voisin, jamais d'un administrateur : « Je participe », « 8 inscrits sur 12 places », « Il reste 4 places ».
5. **Rassurer** : statut explicite (« Vous êtes inscrit », « Complet », « Annulée »), confirmation avant toute action qui engage.
6. **Partager en un geste** : chaque activité et chaque annonce a un lien prêt à coller dans le groupe WhatsApp.

## Organisation des écrans (résident, mobile)

Décisions récentes, qui priment sur les maquettes Stitch d'origine :

- **En-tête** : logo et nom de la résidence à gauche ; à droite, le bouton « +A » (grands caractères et contraste renforcé) et l'**avatar du profil**, qui ouvre le profil.
- **Barre de navigation en bas, trois onglets** :
  - **Accueil** : message d'accueil personnalisé, filtres par envie (catégories), cartes des activités à venir.
  - **Mes activités** : deux onglets internes, **Participations (X)** (par défaut) et **Propositions (X)**.
  - **Annonces** : les annonces du syndic. Une annonce peut avoir une période d'affichage et des pièces jointes (PDF ou autres).
- **Proposer une activité** : un bouton « + » flottant, toujours visible, hors de la barre. Il ouvre la création sur une page dédiée, avec un bouton retour en haut. La création va droit à l'essentiel : le minimum de champs visibles d'un coup, le reste en option.
- **Voisins** (profil, centres d'intérêt, voisins aux mêmes affinités) est accessible depuis l'avatar, pas depuis la barre.

## Les objets de l'app

- **Activité** : titre (50 caractères au plus), catégorie, pictogramme, date et créneau, lieu (un lieu de la résidence ou un lieu libre, « chez Danielle, 2e étage »), jauge de places, badges confort et accessibilité, mot d'accueil « À savoir », conseils, matériel, « Ce que vous pouvez apporter », jusqu'à 5 photos. Proposée par un résident ou par le syndic, et cette origine se voit d'un coup d'œil.
- **Carte d'activité** : photo, pictogramme, date (« Samedi 24 oct. à 16h00 »), titre, lieu, jauge avec texte explicite (« 8 inscrits sur 12 places », « 4 restantes »), badges (« Accès plain-pied », « Chaises prévues »), boutons « Voir les détails » et « Je participe ».
- **Catégories** : Moments partagés, Création & Bricolage, Culture & Loisirs, Entraide & Partage, Jardin & Nature.
- **Annonce** : titre, texte, pictogramme, photo optionnelle, épinglage, période d'affichage, pièces jointes. Réservée au syndic.
- **Inscription** : un geste, avec le nombre d'accompagnants ; modifiable et annulable.
- **Statuts d'un résident** : en attente de validation (il consulte mais ne peut pas s'inscrire : bouton désactivé avec explication), validé, refusé, retiré.

## Exemples de contenus réalistes

- Résidence : « Résidence Les Tilleuls ».
- Activités : « Le Grand Goûter Crêpes & Jeux » (Jardin partagé, samedi 16h00) ; « Atelier bouturage et plantes d'automne » (Hall principal & Verrière, RDC) ; « Cercle de lecture & romans policiers » (chez Colette, 3e étage).
- Accueil : « Bonjour Danielle ! Bât. B, 2e étage. 4 activités prévues cette semaine. »
- Annonce : « Coupure d'eau jeudi de 9h à 12h, bâtiment B ».

## Hors du périmètre de ces écrans

L'espace syndic (tableau de bord, validation des résidents, lieux, modération) est pensé pour l'ordinateur. Il n'a pas encore de maquette : il se conçoit avec la même charte Warm Commons.
