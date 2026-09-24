Sondage du syndic, à placer dans une CarteAnnonce : options à choix unique (56 px de haut), bouton d'envoi, puis résultats en barres vertes avec le choix de la personne coché.

```jsx
<Sondage
  question="Quel créneau vous convient le mieux ?"
  options={[{ libelle: "7h à 21h", votes: 9 }, { libelle: "6h à 23h", votes: 11 }, { libelle: "Accès 24h/24", votes: 3 }]}
  echeance="30 octobre"
/>
<Sondage question="…" options={[…]} choix={1} />  {/* déjà voté : résultats */}
```