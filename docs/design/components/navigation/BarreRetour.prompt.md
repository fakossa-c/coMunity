Barre du haut des pages secondaires (fiche, Profil et ses rubriques, formulaires), **collante** (sticky top 0, fond de page) : bouton fantôme de retour à gauche ; « Partager » et l'avatar profil à droite. Avec `initiale`, les boutons se resserrent pour tenir sur 390 px.

```jsx
<BarreRetour onRetour={retour} onPartager={partager} initiale="D" onProfil={ouvrirMenu} />   {/* fiche */}
<BarreRetour destination="Profil" onRetour={retour} onPartager={null} initiale="D" onProfil={ouvrirMenu} /> {/* rubrique, formulaire */}
```

**Une seule règle : le bouton dit « Retour ».** Jamais « Annuler », « Accueil », « Profil », « Espace syndic » ni « Connexion » comme libellé visible, y compris sur un formulaire : il n'y a pas de libellé libre. `destination` nomme l'écran où l'on revient (« Profil », « Mes identifiants ») et n'est dite qu'aux lecteurs d'écran (« Retour : Profil ») ; l'`href` ne change pas. Dans la création et la modification d'une activité, « Retour » ouvre une `FeuilleConfirmation` (« Abandonner la proposition ? », « Continuer la saisie » / « Abandonner ») quand quelque chose a été saisi, et quitte tout de suite sinon. Les formulaires d'une seule page (syndic, Profil) reviennent sans confirmation. « Précédent » est réservé au bas d'un parcours en étapes, « Fermer » aux feuilles et aux menus.

**Mobile seulement.** Sur ordinateur (cadre Journal), la `BarreHaute` la remplace et le retour devient `LienRetour` : un lien fantôme sur fond bleu très clair, avec la flèche `arrow_back` et le même mot « Retour », en tête du contenu sous la barre du haut ; « Partager » d'une fiche est à l'autre bout de la même rangée.

```jsx
<LienRetour href="/profil" destination="Profil" partager={<BoutonPartager … />} />
```