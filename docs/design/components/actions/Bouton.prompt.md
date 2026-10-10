Bouton en pilule, 56 px de haut (52 px pour la variante fantôme). Toutes les actions principales sont en pêche pastel, jamais en terre cuite pleine. La variante `confirmer` (vert pastel, `secondary-fixed`) sert à confirmer une demande (« Valider » un compte), jamais à agir ; `danger` (contour rouge) à annuler, refuser ou retirer un accès. La variante `neutre` (contour `outline` de 1,5 px sur fond de carte, texte `on-surface`) sert aux gestes secondaires d'un écran où le pêche est réservé à l'action : pour l'instant Annonces seulement (« Relayer sur le groupe WhatsApp »), où `contour` reste le rendu des autres écrans.

```jsx
<Bouton>Je participe</Bouton>
<Bouton variante="confirmer" icone="how_to_reg">Valider</Bouton>
<Bouton variante="contour" icone="visibility">Détails</Bouton>
<Bouton variante="neutre" icone="forum">Relayer sur le groupe WhatsApp</Bouton>
<Bouton variante="danger" icone="event_busy">Annuler</Bouton>
<Bouton variante="fantome" icone="arrow_back" iconeTaille={28}>Retour</Bouton>
```

Dans une carte, deux boutons côte à côte en `flex:1`, contour à gauche, action à droite. CTA de barre fixe : `pleineLargeur` + `style={{fontSize:"var(--text-body-lg)"}}`.