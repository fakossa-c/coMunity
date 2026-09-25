Champ de saisie : libellé 17 px 700 **au-dessus** (jamais de placeholder en guise de libellé), boîte blanche 56 px bordée, rayon 12, texte 18 px, aide 16 px en dessous. 20 px entre deux champs. Toujours renseigner `autoComplete`.

```jsx
<Champ libelle="Nouvel e-mail" type="email" autoComplete="email" aide="Vous recevrez un lien de confirmation à cette adresse." />
<Champ libelle="Mot de passe" secret autoComplete="current-password" />
<Champ libelle="Bâtiment" valeur="Bât. B" options={["Bât. A", "Bât. B", "Bât. C"]} />
```