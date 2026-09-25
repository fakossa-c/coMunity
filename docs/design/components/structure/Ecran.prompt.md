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