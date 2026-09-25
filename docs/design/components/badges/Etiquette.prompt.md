Badge confort ou accessibilité d'une activité, pastille pastel.

```jsx
<Etiquette ton="vert" icone="accessible">Accès plain-pied</Etiquette>
<Etiquette ton="abricot" icone="child_care">Enfants bienvenus</Etiquette>
```

Les valeurs sont deux listes fermées (voir « Étiquettes d'activité » dans le README) ; le formulaire les coche avec `ChoixEtiquettes`.

La même pastille dit aussi l'état d'une activité (ticket #12, à maquetter) : `ton="erreur"` pour « Annulée », `vert` pour « Confirmée », `abricot` pour « Encore N participants pour confirmer ».
