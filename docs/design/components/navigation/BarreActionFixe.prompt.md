Panneau blanc fixé en bas des fiches (remplace la barre de navigation), ombre portée vers le haut. Contient l'action principale de l'écran.

```jsx
<BarreActionFixe>
  <Compteur valeur={2} onChange={setN} />
  <Bouton pleineLargeur style={{ fontSize: "var(--text-body-lg)" }}>Je participe, avec 2 personnes</Bouton>
</BarreActionFixe>
```