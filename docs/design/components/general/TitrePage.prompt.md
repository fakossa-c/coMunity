Titre de rubrique en haut d'une page à onglet (Activités, Annonces). Il défile avec le contenu. Sur ordinateur (présentation Journal), il prend `--titre-journal` : 72/76 en 800, 90 en grands caractères. Dans la carte des écrans de connexion (`EcranConnexion`), il prend `headline-xl` (34 px, 43 en grands caractères) : la carte surcharge `--text-titre-journal`.

```jsx
<TitrePage titre="Activités" sousTitre="Vos inscriptions et vos propositions" />
```