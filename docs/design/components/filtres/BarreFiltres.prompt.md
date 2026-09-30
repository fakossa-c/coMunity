Rangée de puces **collante** (sticky top 0, fond de page). Règle : toute barre de filtres, actuelle ou future, colle en haut de l'écran. Des onglets qui la précèdent collent avec elle, dans le même bloc, via `avant`. Variante `accueil` : sur mobile la rangée défile au doigt, sans barre de défilement visible ; sur ordinateur, les puces passent à la ligne et rien ne défile.

```jsx
<BarreFiltres>
  <PuceFiltre categorie selectionnee>Toutes</PuceFiltre>
  <PuceFiltre categorie icone="potted_plant">Jardin & Nature</PuceFiltre>
</BarreFiltres>

<BarreFiltres variante="liste" avant={<Onglets onglets={…} actif={onglet} onChange={setOnglet} />}>
  <PuceFiltre selectionnee icone="event">À venir</PuceFiltre>
  <PuceFiltre icone="history">Passées</PuceFiltre>
</BarreFiltres>
```