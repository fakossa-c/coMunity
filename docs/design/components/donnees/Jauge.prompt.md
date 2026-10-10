Jauge de places d'une activité : une barre de remplissage de 8 px (`h-2`, arrondie), terre cuite `--color-primary` sur le fond `--color-surface-container-low`, placée au-dessus ; dessous, une ligne en `body-md` `--color-on-surface-variant` : « 8 inscrits sur 12 places ». La barre prend cette ligne pour nom accessible (`role="progressbar"`, `aria-labelledby`, `aria-valuenow` = inscrits, `aria-valuemax` = capacité) : un lecteur d'écran dit de quoi elle parle. Les places restantes ne sont pas dans la jauge : la carte d'inscription les porte.

États :
- Avec capacité : « 8 inscrits sur 12 places », barre remplie à 8/12.
- Sans capacité (`capaciteMax` à `null`) : « 8 inscrits » seul, pas de barre.
- Aucun inscrit : « Aucun inscrit sur 12 places », barre vide. Sans capacité, « Aucun inscrit ».
- Un inscrit : « 1 inscrit sur 12 places ». Sans capacité, « 1 inscrit ».
- Complet : « 12 inscrits sur 12 places », barre pleine (le remplissage ne dépasse jamais 100 %).

```jsx
<Jauge placesPrises={8} capaciteMax={12} />
```
