Cadre d'un écran mobile qui porte le comportement des en-têtes : une zone qui défile, une barre fixée en bas, un bouton flottant optionnel.

```jsx
<Ecran barreEtat="9:41" barreBas={<BarreNavigation actif="accueil" />}>
  <EnTeteResidence … />          {/* défile */}
  <Salutation … />               {/* défile */}
  <BarreFiltres>…</BarreFiltres> {/* collant */}
  …cartes
</Ecran>
```

Comportements :
- **Accueil** : en-tête + salutation défilent, `BarreFiltres` colle en haut, `BarreNavigation` fixe.
- **Fiche** : `BarreRetour` colle en haut, `BarreActionFixe` fixe en bas (`paddingBas={170}`), pas de navigation.
- **Rubrique (Activités)** : `TitrePage` + `Onglets` défilent, `BarreFiltres variante="liste"` colle, `BoutonFlottant` + `BarreNavigation` fixes.

**Sur ordinateur** (cadre Journal), le contenu suit le conteneur de 1280 px aux marges de 64 px, identique sur toutes les pages (plus de colonne étroite ni de pleine largeur). Avec `menu` (le `MenuSyndic` de l'espace syndic), le menu est collé au bord gauche et le contenu, de 1152 px au plus, se centre dans l'espace restant. La `BarreHaute` précède le contenu ; il n'y a plus de barre du bas, la réserve basse du contenu est `paddingBasBureau` (40 par défaut sur les écrans principaux).