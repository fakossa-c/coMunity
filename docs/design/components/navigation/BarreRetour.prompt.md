Barre du haut des pages secondaires (fiche, Profil et ses rubriques, formulaires), **collante** (sticky top 0, fond de page) : bouton fantôme de retour à gauche ; « Partager » et l'avatar profil à droite. Avec `initiale`, les boutons se resserrent pour tenir sur 390 px.

```jsx
<BarreRetour onRetour={retour} onPartager={partager} initiale="D" onProfil={ouvrirMenu} />   {/* fiche */}
<BarreRetour libelleRetour="Profil" onRetour={retour} onPartager={null} initiale="D" onProfil={ouvrirMenu} /> {/* rubrique */}
<BarreRetour libelleRetour="Annuler" onRetour={retour} onPartager={null} initiale="D" onProfil={ouvrirMenu} /> {/* formulaire */}
```

Le libellé de retour nomme la destination (« Profil ») ou l'effet (« Annuler » dans un formulaire).