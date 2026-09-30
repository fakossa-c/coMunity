Panneau blanc fixé en bas des fiches (remplace la barre de navigation), ombre portée vers le haut. Contient l'action principale de l'écran.

```jsx
<BarreActionFixe>
  <Compteur valeur={2} onChange={setN} />
  <Bouton pleineLargeur style={{ fontSize: "var(--text-body-lg)" }}>Je participe, avec 2 personnes</Bouton>
</BarreActionFixe>
```

Sur ordinateur (cadre Journal), elle reste collée au bas de la fenêtre mais suit le conteneur de 1280 px aux marges de 64 px, comme le contenu ; dans l'espace syndic, elle laisse libre la largeur du menu de gauche. Un écran dont l'action passe dans une carte ou une colonne visible (Proposer) peut la retirer sur ordinateur.

Avec `carte`, l'action reste la barre du bas sur mobile, et devient sur ordinateur une carte dans la page, à poser dans la colonne de droite d'une grille : blanche, sans contour, ombre douce, rayon 28, marge intérieure 32, collante à 1,5 rem du haut (`self-start`, la grille aligne ses colonnes en haut), ses enfants empilés à 20 px. C'est la carte d'inscription de la fiche d'une activité ; elle porte alors son propre « Votre place » réservé à l'ordinateur.

```jsx
<BarreActionFixe carte>
  <h2 className="hidden desktop:block">Votre place</h2>
  <Bouton pleineLargeur>Je participe</Bouton>
</BarreActionFixe>
```