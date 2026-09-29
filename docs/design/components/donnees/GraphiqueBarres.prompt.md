Graphique en barres horizontales du tableau de bord : un titre, une phrase qui en donne l'essentiel, puis une ligne par valeur (libellé, valeur en gras, complément en gris) sous laquelle la barre verte pastel (`secondary-fixed-dim`, 10 px) montre la proportion. Le texte porte tout : les barres sont décoratives (`aria-hidden`), un lecteur d'écran lit « Samedi, 60 %, 2 activités ». Carte à bordure de 1,5 px, sans ombre, rayon 16, padding 16.

```jsx
<GraphiqueBarres
  titre="Par jour de la semaine"
  resume="Meilleur remplissage moyen : Samedi, 60 %."
  maximum={100}
  barres={[
    { cle: "1", libelle: "Lundi", valeur: 30, texteValeur: "30 %", detail: "2 activités" },
    { cle: "6", libelle: "Samedi", valeur: 60, texteValeur: "60 %", detail: "2 activités" },
    { cle: "7", libelle: "Dimanche", valeur: null, texteValeur: "Aucune activité" },
  ]}
/>
```

`valeur` va de 0 à `maximum` (100 pour un pourcentage, le plus grand nombre pour un effectif) ; `null` ou 0 : pas de barre, la ligne reste et dit pourquoi dans `texteValeur`. Un groupe sans donnée figure toujours, à zéro : un jour vide est une information.
