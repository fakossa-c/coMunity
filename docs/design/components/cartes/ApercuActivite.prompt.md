Aperçu vivant de la carte d'une activité, dans la colonne de droite de Proposer sur ordinateur : il suit la saisie à chaque frappe. Carte blanche à contour transparent (ombre douce sur ordinateur, rayon 24), sans lien ni bouton : c'est une image de ce que verront les voisins, pas une carte à ouvrir. Ordre fixe : visuel · pastille de catégorie · **jour et horaire terre cuite** · titre · description · lieu · places · étiquettes.

- **Visuel** : la première photo choisie (la couverture), à défaut le pictogramme sur le pastel de la catégorie (`VisuelActivite`, 128 px, sans arrondi). Choisir une autre catégorie change tout de suite le pastel et la pastille.
- **Pastille de catégorie** : rond de 36 px avec le pictogramme de l'activité, aux couleurs `couleurDe(categorie)`, suivi du libellé de la catégorie.
- **Jour et horaire** : « Samedi 24 octobre · De 16h00 à 18h30 » ; incomplet, le jour seul ; avant tout choix, « Date et heure à choisir ». Fonction `resumeCreneau` de `src/lib/proposition-activite.ts`.
- **Titre et description** : le titre en 22/30 et la description sur trois lignes au plus. Vides, ils montrent « Le titre de votre activité » et « La description de votre activité apparaîtra ici. » en italique, en `on-surface-variant` (jamais `outline`, trop pâle sur blanc).
- **Lieu** (« Lieu à choisir » avant tout choix) et **places** (`resumePlaces` : « Jusqu'à 12 personnes · confirmée dès 4 », « Sans limite de places », « Nombre de places à indiquer »), chacun avec son pictogramme de 20 px.
- **Étiquettes** : `EtiquettesActivite`, vertes pour l'accessibilité, abricot pour « Pour qui » ; rien sans étiquette.
- **Différence avec la carte de l'Accueil** : elle montre la description, le lieu et les places à découvert, là où la carte de l'Accueil range lieu et étiquettes dans son tiroir « Détails » ; elle n'a pas de jauge ni de boutons.

```jsx
<ApercuActivite titre="Goûter d'automne" categorie="moments_partages" pictogramme="waving_hand"
  description="Crêpes sucrées et salées, jeux de société pour tous." creneau="Samedi 24 octobre · De 16h00 à 18h30"
  lieu="Jardin partagé" places="Jusqu'à 12 personnes · confirmée dès 4" etiquettes={["acces_plain_pied"]} />
<ApercuActivite titre="" categorie="moments_partages" pictogramme="waving_hand" description=""
  creneau="Date et heure à choisir" lieu="" places="Sans limite de places" etiquettes={[]} />
```
