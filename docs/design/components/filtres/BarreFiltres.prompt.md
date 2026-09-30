Rangée de puces **collante** (sticky top 0, fond de page). Règle : toute barre de filtres, actuelle ou future, colle en haut de l'écran. Des onglets qui la précèdent collent avec elle, dans le même bloc, via `avant` ; sans puces (Activités), elle ne colle que ces onglets. Variante `accueil` : sur mobile la rangée défile au doigt, sans barre de défilement visible ; sur ordinateur, les puces passent à la ligne et rien ne défile.

```jsx
<BarreFiltres>
  <PuceFiltre categorie selectionnee>Toutes</PuceFiltre>
  <PuceFiltre categorie icone="potted_plant">Jardin et nature</PuceFiltre>
</BarreFiltres>

<BarreFiltres avant={<Onglets libelleGroupe="Mes activités" actif="je_participe" onglets={…} />} />
```