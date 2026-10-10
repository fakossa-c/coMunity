Badge confort ou accessibilité d'une activité, pastille pastel.

```jsx
<Etiquette ton="vert" icone="accessible">Accès plain-pied</Etiquette>
<Etiquette ton="abricot" icone="child_care">Enfants bienvenus</Etiquette>
```

Les valeurs sont deux listes fermées (voir « Étiquettes d'activité » dans le README) ; le formulaire les coche avec `ChoixEtiquettes`.

La même pastille dit aussi l'état d'une activité (ticket #12, à maquetter) : `ton="erreur"` pour « Annulée », `vert` pour « Confirmée », `abricot` pour « Encore N participants pour confirmer ».

## « Nouveau »

« Nouveau » (annonce publiée depuis moins de 7 jours) n'est pas une pastille : c'est le composant `Nouveau`, un texte terre cuite (`primary`) en 800 précédé d'un point plein de 9 px, sans fond, pour que le pêche reste celui de l'action et de la pastille de type « Assemblée générale ». Même rendu sur la carte de la liste, la fiche d'une annonce et la liste des annonces de l'espace syndic.

```jsx
<Nouveau />
```
