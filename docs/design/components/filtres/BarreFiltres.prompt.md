Rangée de puces **collante** (sticky top 0, fond de page). Règle : toute barre de filtres, actuelle ou future, colle en haut de l'écran. Des onglets qui la précèdent collent avec elle, dans le même bloc, via `avant`.

**Jamais de barre de défilement visible.** Sur mobile, la rangée `accueil` défile au doigt, barre masquée ; sur ordinateur, ses puces passent à la ligne.

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