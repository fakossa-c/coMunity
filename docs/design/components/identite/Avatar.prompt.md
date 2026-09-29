Pastille d'initiale d'un voisin (pêche), ou sa photo quand on en a une (prop `photo`, ronde et recadrée). La version marine est réservée au profil de la personne connectée, dans l'en-tête (voir `BoutonRond`).

Avec `photo` (adresse de l'image), la pastille montre la photo de la personne, rognée en cercle, à la place de l'initiale : profil de la personne connectée (Profil, Mes informations), mais aussi tout voisin nommé avec un avatar (organisateur de la fiche, participants) quand il a une photo. La photo n'a pas de réglage de visibilité ; l'initiale du pseudo ne sert qu'à défaut de photo.

```jsx
<Avatar initiale="M" />
<Avatar initiale="D" variante="marine" taille={72} photo="/photo.jpg" />
```