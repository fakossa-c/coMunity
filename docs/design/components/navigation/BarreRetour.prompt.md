Barre du haut des pages secondaires (fiche, Profil et ses rubriques, formulaires), **collante** (sticky top 0, fond de page) : bouton fantôme de retour à gauche ; « Partager » et l'avatar profil à droite. Avec `initiale`, les boutons se resserrent pour tenir sur 390 px.

```jsx
<BarreRetour onRetour={retour} onPartager={partager} initiale="D" onProfil={ouvrirMenu} />   {/* fiche */}
<BarreRetour libelleRetour="Profil" onRetour={retour} onPartager={null} initiale="D" onProfil={ouvrirMenu} /> {/* rubrique */}
<BarreRetour libelleRetour="Annuler" onRetour={retour} onPartager={null} initiale="D" onProfil={ouvrirMenu} /> {/* formulaire */}
```

Le libellé de retour nomme la destination (« Profil ») ou l'effet (« Annuler » dans un formulaire).

**Mobile seulement.** Sur ordinateur (cadre Journal), la `BarreHaute` la remplace et le retour devient `LienRetour` : un lien fantôme sur fond bleu très clair, avec la flèche `arrow_back` et le même libellé (destination ou effet), en tête du contenu sous la barre du haut ; « Partager » d'une fiche est à l'autre bout de la même rangée.

```jsx
<LienRetour href="/profil" libelle="Profil" partager={<BoutonPartager … />} />
```