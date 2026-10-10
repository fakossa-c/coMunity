Pastille d'initiale d'un voisin (pêche), ou sa photo quand on en a une (prop `photo`, ronde et recadrée). La version marine est réservée au profil de la personne connectée, dans l'en-tête (voir `BoutonRond`). Deux variantes sont réservées aux listes de l'espace syndic (Résidents), de 52 px : `neutre`, cercle plein `surface-container-high` avec l'initiale en `on-surface` (un résident validé), et `attente`, cercle à contour pointillé `outline` avec un sablier (un compte qui attend sa validation ; nommé « Compte en attente » pour le lecteur d'écran, sans initiale). Partout ailleurs, un voisin reste pêche.

Avec `photo` (adresse de l'image), la pastille montre la photo de la personne, rognée en cercle, à la place de l'initiale : profil de la personne connectée (Profil, Mes informations), mais aussi tout voisin nommé avec un avatar (organisateur de la fiche, participants) quand il a une photo. La photo n'a pas de réglage de visibilité ; l'initiale du pseudo ne sert qu'à défaut de photo.

```jsx
<Avatar initiale="M" />
<Avatar initiale="D" variante="marine" taille={72} photo="/photo.jpg" />
```