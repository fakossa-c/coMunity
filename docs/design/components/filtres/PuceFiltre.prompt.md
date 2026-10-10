Puce de filtre en pilule, 52 px. Sélectionnée : fond pêche et coche. Non sélectionnée : blanc bordé pêche ; en mode `categorie`, le pictogramme est en terre cuite. L'option `neutre`, réservée à l'écran Annonces (le pêche y est celui de l'action), rend la sélectionnée en bleu clair (`surface-container-high`) avec son libellé `on-surface` en 800 et sa coche pleine foncée, et les autres avec un contour `outline` de 1,5 px ; l'Accueil et le tableau de bord syndic gardent le rendu pêche.

```jsx
<PuceFiltre selectionnee>Toutes</PuceFiltre>
<PuceFiltre categorie icone="celebration">Moments partagés</PuceFiltre>
<PuceFiltre icone="event">Cette semaine</PuceFiltre>
<PuceFiltre neutre categorie selectionnee>Toutes</PuceFiltre>
```
