Bouton en pilule, 56 px de haut (52 px pour la variante fantôme). Toutes les actions principales sont en pêche pastel, jamais en terre cuite pleine.

```jsx
<Bouton>Je participe</Bouton>
<Bouton variante="contour" icone="visibility">Détails</Bouton>
<Bouton variante="danger" icone="event_busy">Annuler</Bouton>
<Bouton variante="fantome" icone="arrow_back" iconeTaille={28}>Retour</Bouton>
```

Dans une carte, deux boutons côte à côte en `flex:1`, contour à gauche, action à droite. CTA de barre fixe : `pleineLargeur` + `style={{fontSize:"var(--text-body-lg)"}}`.