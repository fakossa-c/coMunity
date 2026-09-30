Carte d'activité, blanche, bordure 1,5 px à 18 %, rayon 16, ombre plate de 3 px. Ordre fixe : [bandeau syndic] · photo · catégorie · **date terre cuite** · auteur · titre · lieu · jauge · badges · [Détails dépliables] · statut · boutons.

**Couleur de catégorie.** Le visuel sans photo (Accueil, fiche) et la pastille de pictogramme de la catégorie (Accueil et Activités › Je participe) prennent le pastel de leur catégorie et son encre `on-categorie-*` (tableau dans `docs/design/README.md`, « Catégories d'activité »). La pastille est un rond : 48 px avec le pictogramme de l'activité dans Activités, 36 px avec celui de la catégorie sur l'Accueil. Avec une photo, seule la pastille garde la couleur. Les classes viennent de `couleurDe(categorie)` dans `src/lib/categories-activite.ts`, jamais d'une couleur écrite dans la carte.

Trois usages :
- **À la une** (`aLaUne`, en tête de l'Accueil, ordinateur) : deux colonnes 55 / 45 % (le visuel de la catégorie ou la première photo, sur toute la hauteur, puis le texte) ; empilé sur mobile (visuel de 192 px). Dans le texte : pastille pêche « À la une », jour et horaire en terre cuite, titre en grand (lien vers la fiche), lieu, jauge, puis « Je participe » (`action`) et « Voir la fiche » (`contour`) ; un résident inscrit lit le statut « Vous participez » à la place de « Je participe ». L'activité n'est plus dans la grille. Sans tiroir « Détails ».
- **Accueil** (liste par jour, sous un `TitreSection` ; trois colonnes par jour sur ordinateur, une colonne sur mobile ; survol en légère élévation) : `detailsDepliables` + `horaire` au lieu de `date`. Horaire, lieu, accessibilité (étiquettes vertes) et « Pour qui » (autres étiquettes) passent dans un tiroir « Détails » de 52 px sur fond bleu clair. Boutons : « Voir la fiche » (contour) + « Je participe ». Une activité où l'on est déjà inscrit montre le statut « Vous participez » et plus de boutons (`actions="aucune"`).
- **Activités › Je participe et J'organise** : sans photo, `date` complète, `statut` (« Vous participez », état de l'activité, jauge) ; toute la carte ouvre la fiche, sans bouton. Sur ordinateur, sans contour (ombre douce), trois colonnes pour Je participe et deux pour J'organise (gap de 32 px, 24 px entre les rangées), une colonne sur mobile ; survol en légère élévation. Le passé est dans `LigneArchivee`.

```jsx
<CarteActivite photo="photo · goûter au jardin" categorie={{ nom: "Moments partagés", icone: "celebration" }}
  horaire="De 16h00 à 18h30" detailsDepliables titre="Le Grand Goûter Crêpes & Jeux" lieu="Jardin partagé"
  inscrits={8} places={12}
  etiquettes={[{ ton: "vert", icone: "accessible", libelle: "Accès plain-pied" }, { ton: "abricot", icone: "child_care", libelle: "Enfants bienvenus" }]} />
<CarteActivite syndic detailsDepliables horaire="À partir de 18h00" titre="Atelier bouturage et plantes d'automne" lieu="Hall principal & Verrière, RDC" />
<CarteActivite aLaUne photo="photo · goûter au jardin" categorie={{ nom: "Moments partagés", icone: "celebration" }}
  horaire="Samedi 24 octobre · De 16h00 à 18h30" titre="Le Grand Goûter Crêpes & Jeux" lieu="Jardin partagé" inscrits={8} places={12} />
<CarteActivite date="Samedi 24 oct. à 16h00" titre="Le Grand Goûter Crêpes & Jeux" lieu="Jardin partagé" statut="Vous participez, avec 2 personnes" />
```

À définir : les valeurs d'étiquettes deviendront des listes fermées.