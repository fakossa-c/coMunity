Barre du haut du cadre Journal, **sur ordinateur seulement** (à partir de 64 rem ; masquée en dessous, où `EnTeteResidence` et `BarreRetour` restent). Légère, sans bordure ni fond propre, sur le conteneur de 1280 px aux marges de 64 px, haute de 88 px. Trois zones en grille `1fr auto 1fr` : le logo (32 px, lien vers l'Accueil) à gauche, les onglets `BarreNavigation haut` au centre, « Proposer » et l'avatar du `MenuProfil` à droite. Elle défile avec la page.

- « Proposer » (`Bouton` action, pictogramme `add`) n'est pas dans la barre sur l'écran Proposer.
- Un compte refusé ou retiré n'a ni onglets ni « Proposer », seulement l'avatar (déconnexion). Les écrans de connexion n'ont que le logo. Un visiteur voit « Se connecter » à la place de l'avatar.
- L'onglet de la page courante est en pêche et en 800, avec `aria-current="page"` ; un écran secondaire n'en a aucun.
- Le nom de la résidence n'y figure pas (les maquettes n'en ont pas) ; le mobile le garde.

```jsx
<BarreHaute
  navigation={<BarreNavigation actif="activites" emplacement="haut" />}
  actions={<><LienProposer /><MenuProfil initiale="D" nom="Danielle" adresse="Bât. B, 2e étage" /></>}
/>
```
