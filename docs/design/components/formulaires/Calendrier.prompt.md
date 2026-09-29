Calendrier du mois affiché **dans la page** (jamais la fenêtre du navigateur) pour choisir un jour : étape « Date et lieu » de Proposer. Libellé 17 px 700 au-dessus, puis une carte blanche bordée (`outline`, rayon 12) : en tête, `BoutonRond` « Mois précédent » et « Mois suivant » de part et d'autre du mois en titre de 19 px (« Octobre 2026 »), puis la grille du mois, en français, **semaine du lundi au dimanche** (L M M J V S D).

- **Jours** : cibles de 44 px au moins (cercle de 44 px, la grille remplit la carte sans marge latérale pour tenir à 360 px ; la carte ne dépasse pas 448 px sur ordinateur). Jour choisi : **pêche plein** (`fond-action`), contour `contour-action` et graisse 800, jamais la couleur seule. Aujourd'hui : contour et texte terre cuite (`texte-date`). Jours passés : grisés et désactivés ; « Mois précédent » l'est aussi sur le mois en cours. Les jours des mois voisins ne sont pas affichés.
- **Clavier** : un seul jour reçoit le focus à la fois (Tab entre dans la grille, puis sort) ; flèches gauche et droite = jour, haut et bas = semaine, **Début** = lundi de la semaine, **Fin** = dimanche, d'un mois sur l'autre. Jamais avant aujourd'hui. Entrée ou Espace choisit.
- **Lecteur d'écran** : chaque jour se lit en toutes lettres (« samedi 24 octobre 2026, aujourd'hui »), le jour choisi est « appuyé », le changement de mois et le jour choisi sont annoncés (« samedi 24 octobre 2026 sélectionné »). Erreur (« Choisissez une date. ») en dessous, annoncée, bordure `error`.
- **Thèmes** : uniquement des tokens, donc thème sombre et grands caractères (`--text-*` × 1,25) sans réglage ; les jours restent des cibles de 44 px au moins.
- Les heures qui vont avec ne se tapent pas : deux `ChampListe`, « Heure de début » et « Heure de fin », par pas de 15 minutes, affichées « 14h30 ».

```jsx
<Calendrier libelle="Date" valeur={date} onChange={setDate} aujourdhui="2026-10-24" />
<Calendrier libelle="Date" valeur="" onChange={setDate} aujourdhui="2026-10-24" erreur="Choisissez une date." />
```
