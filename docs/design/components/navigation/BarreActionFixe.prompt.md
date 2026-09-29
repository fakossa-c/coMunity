Panneau blanc fixé en bas des fiches (remplace la barre de navigation), ombre portée vers le haut. Contient l'action principale de l'écran.

```jsx
<BarreActionFixe>
  <Compteur valeur={2} onChange={setN} />
  <Bouton pleineLargeur style={{ fontSize: "var(--text-body-lg)" }}>Je participe, avec 2 personnes</Bouton>
</BarreActionFixe>
```

Sur ordinateur (cadre Journal), elle reste collée au bas de la fenêtre mais suit le conteneur de 1280 px aux marges de 64 px, comme le contenu. Les écrans dont l'action passe dans une carte ou une colonne visible (fiche, Proposer) la retirent dans leur propre ticket.