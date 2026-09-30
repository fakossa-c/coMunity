Onglets internes d'une rubrique, en contrôle segmenté (Activités : « Je participe », « J'organise », « Archivées »). Une pilule `surface-container` porte les segments ; le segment actif est plein pêche (`fond-action`, texte `texte-action`, pictogramme plein), les autres sans fond. Ce sont des liens dans une `nav`, l'actif porte `aria-current="page"`. Chaque segment porte un compteur dans une pastille `fond-carte` (blanche en clair, foncée en sombre), que le lecteur d'écran lit « 2 activités ».

Mobile : les segments se partagent la largeur (64 px de haut), libellé au-dessus du compteur, sans pictogramme. Ordinateur : segments de 212 px sur 54, pictogramme, libellé et compteur côte à côte. Le passage d'un segment à l'autre change les couleurs en 0,35 s (`--duree-courte`, coupé par la préférence de réduction des animations). Ils collent avec la `BarreFiltres` qui les porte via `avant`.

```jsx
<Onglets libelleGroupe="Mes activités" actif="je_participe" onglets={[
  { id: "je_participe", libelle: "Je participe", href: "/activites?onglet=je_participe", icone: "event_available", compteur: 5 },
  { id: "j_organise", libelle: "J’organise", href: "/activites?onglet=j_organise", icone: "edit", compteur: 2 },
  { id: "archivees", libelle: "Archivées", href: "/activites?onglet=archivees", icone: "history", compteur: 6 },
]} />
```
