Identité de la personne connectée, toujours avec l'avatar marine (le même que dans les en-têtes). Avec `photo`, l'avatar montre la photo de la personne à la place de l'initiale de son pseudo. Sur ordinateur (présentation Journal), le nom de la page Profil (`grand`) prend le très grand titre `--titre-journal`.

```jsx
<EnTeteProfil initiale="D" nom="Danielle" adresse="Bât. B, 2e étage" />                 {/* page Profil */}
<EnTeteProfil taille="compact" initiale="D" nom="Danielle" adresse="Bât. B, 2e étage" /> {/* MenuProfil */}
```