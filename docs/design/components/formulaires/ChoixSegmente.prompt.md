Choix exclusif entre 2 ou 3 options, en cases de 64 px sur un fond bleu `surface-container`. L'option active passe en carte blanche bordée, icône pleine. Précédé d'un `TitreSection`.

```jsx
<TitreSection style={{ marginBottom: 10 }}>Apparence</TitreSection>
<ChoixSegmente libelle="Apparence" valeur={theme} onChange={setTheme}
  options={[{ id: "clair", libelle: "Clair", icone: "light_mode" }, { id: "sombre", libelle: "Sombre", icone: "dark_mode" }]} />
```

Pour la taille des caractères, `visuel` montre un « A » à 20 px et à 28 px.