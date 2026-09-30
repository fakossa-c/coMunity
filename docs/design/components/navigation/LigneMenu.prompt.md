Entrée de menu qui mène à une sous-page : pastille pêche, titre 17 px 700, description, chevron. Empiler avec 10 px (page) ou 8 px (feuille) d'écart.

```jsx
<nav style={{ display: "flex", flexDirection: "column", gap: 10 }}>
  <LigneMenu icone="key" titre="Mon compte" onClick={…} />
  <LigneMenu icone="badge" titre="Mes informations" detail="Ce que vos voisins voient de vous" onClick={…} />
</nav>
```