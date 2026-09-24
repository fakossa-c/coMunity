Carte d'activité, blanche, bordure 1,5 px à 18 %, rayon 16, ombre plate de 3 px. Ordre fixe : [bandeau syndic] · photo · catégorie · **date terre cuite** · auteur · titre · lieu · jauge · badges · [Détails dépliables] · statut · boutons.

Deux usages :
- **Accueil** (liste par jour, sous un `TitreSection`) : `detailsDepliables` + `horaire` au lieu de `date`. Horaire, lieu, accessibilité (étiquettes vertes) et « Pour qui » (autres étiquettes) passent dans un tiroir « Détails » de 52 px sur fond bleu clair. Boutons : « Voir la fiche » (contour) + « Je participe ». Une activité où l'on est déjà inscrit montre le statut et plus de boutons (`actions="aucune"`).
- **Activités › J'y vais** : sans photo, `date` complète, `statut` → boutons « Détails » + « Annuler » (danger).

```jsx
<CarteActivite photo="photo · goûter au jardin" categorie={{ nom: "Moments partagés", icone: "celebration" }}
  horaire="De 16h00 à 18h30" detailsDepliables titre="Le Grand Goûter Crêpes & Jeux" lieu="Jardin partagé"
  inscrits={8} places={12}
  etiquettes={[{ ton: "vert", icone: "accessible", libelle: "Accès plain-pied" }, { ton: "abricot", icone: "child_care", libelle: "Enfants bienvenus" }]} />
<CarteActivite syndic detailsDepliables horaire="À partir de 18h00" titre="Atelier bouturage et plantes d'automne" lieu="Hall principal & Verrière, RDC" />
<CarteActivite date="Samedi 24 oct. à 16h00" titre="Le Grand Goûter Crêpes & Jeux" lieu="Jardin partagé" statut="Inscrite, avec 2 personnes" />
```

À définir : les valeurs d'étiquettes deviendront des listes fermées.