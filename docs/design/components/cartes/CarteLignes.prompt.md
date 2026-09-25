Carte blanche bordée (sans ombre : on la lit, on ne la touche pas en entier) découpée en lignes de 64 px séparées par le filet de carte. Libellé 16 px discret au-dessus, valeur 17 px 700, action à droite.

```jsx
<CarteLignes lignes={[
  { icone: "mail", titre: "E-mail", detail: "danielle.m@exemple.fr", fin: <Bouton variante="fantome" style={{ padding: "0 12px" }} aria-label="Modifier l’e-mail">Modifier</Bouton> },
  { icone: "lock", titre: "Mot de passe", detail: "••••••••", fin: … },
]} />
```