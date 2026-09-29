Sondage du syndic, à placer dans une CarteAnnonce : options à choix unique (56 px de haut), bouton d'envoi, puis résultats en barres vertes avec le choix de la personne coché. Sur ordinateur (présentation Journal), les options n'ont plus de contour et s'arrondissent à 18 px ; en thème sombre, la barre de résultat est le vert profond `secondary-container`, sous un libellé clair.

```jsx
<Sondage
  question="Quel créneau vous convient le mieux ?"
  options={[{ libelle: "7h à 21h", votes: 9 }, { libelle: "6h à 23h", votes: 11 }, { libelle: "Accès 24h/24", votes: 3 }]}
  echeance="30 octobre"
/>
<Sondage question="…" options={[…]} choix={1} />  {/* déjà voté : résultats */}
```

Dans l'app (ticket #39), le composant reçoit le résultat de la logique plutôt que des votes bruts : `question`, `options` (les libellés), `echeance`, `affichage` (`vote`, `lecture` ou `resultats` avec les pourcentages, le nombre de réponses, le `choix` de la personne et `clos`) et `onVoter(rang)` (rang de l'option, à partir de 1). Un compte qui ne peut pas répondre lit les options (`lecture`) ; le conseil syndical, qui lit les résultats avant d'avoir répondu, garde « Répondre au sondage ».
