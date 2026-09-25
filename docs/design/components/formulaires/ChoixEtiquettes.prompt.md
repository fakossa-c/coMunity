Une liste fermée d'étiquettes à cocher dans un formulaire (étape « Capacité et confort » du parcours Proposer). Titre de groupe en libellé 17 px 700, puis les options en pastilles de 52 px : blanche bordée avec son pictogramme au repos, **pêche pleine avec une coche** une fois choisie (sélection = pêche plein + coche). Les listes et leurs libellés sont celles d'`Etiquette` : Accessibilité (Accès plain-pied, Ascenseur, Chaises prévues, Sièges confortables, Ambiance calme) et Pour qui (Enfants bienvenus, Tous âges, Animaux acceptés). Une fois publiée, l'activité montre ses étiquettes dans le ton de leur groupe (`Etiquette` vert ou abricot).

```jsx
<ChoixEtiquettes groupe="accessibilite" valeurs={etiquettes} onChange={setEtiquettes} />
<ChoixEtiquettes groupe="pour_qui" valeurs={etiquettes} onChange={setEtiquettes} />
```
