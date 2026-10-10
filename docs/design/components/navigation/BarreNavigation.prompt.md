Barre de navigation du bas, trois onglets, quatre pour un membre actif du conseil syndical (« Syndic », pictogramme `monitoring`, vers le tableau de bord de l'espace syndic ; actif sur toutes ses pages). Actif : pilule pêche 60 × 32 derrière un pictogramme plein, libellé 800. Toujours fixe en bas (via `Ecran`).

```jsx
<BarreNavigation actif="activites" onChange={setEcran} />
```

**Sur ordinateur** (cadre Journal), la barre du bas n'existe pas : les mêmes onglets sont dans la `BarreHaute`, le quatrième s'y appelant « Tableau de bord » (après Annonces), en pilules de libellé seul (48 px de haut, 24 px de marge, 17 px 700 ; 14 px de marge sous 80 rem quand ils sont quatre, pour tenir avec « Proposer » et l'avatar). Actif : libellé `on-surface` en 800, souligné d'un trait de 3 px `--color-primary` sous le libellé seul, sans fond (les autres onglets gardent un trait transparent de même épaisseur, rien ne bouge), `aria-current="page"`. Survol : fond bleu très clair. Transition de 0,35 s.

```jsx
<BarreNavigation actif="activites" emplacement="haut" />   {/* barre du haut, ordinateur */}
<BarreNavigation actif="activites" emplacement="bas" />    {/* barre du bas, mobile */}
<BarreNavigation actif="syndic" emplacement="haut" syndic />  {/* membre actif du conseil syndical, dans l'espace syndic */}
```