En-tête des écrans principaux (Accueil, Activités, Annonces) : logo 24 px, nom de la résidence, avatar marine qui ouvre le `MenuProfil`. **Il défile** avec la page (non collant). Le bouton « +A » a disparu : la taille des caractères se règle dans Profil › Mes réglages.

```jsx
<EnTeteResidence residence="Les Reflets de l’Ourcq" initiale="D" onProfil={() => setMenu(true)} />
```

**Mobile seulement** : sur ordinateur (cadre Journal), la `BarreHaute` la remplace (logo seul, onglets, « Proposer », avatar). Le nom de la résidence n'y figure donc plus.