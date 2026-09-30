# App résident (mobile)

Recréation cliquable de l'app, cadre 390 × 844, composée uniquement des composants du système.

## Écrans
- **Principaux** (barre de navigation) : Accueil (activités groupées par jour, « Aujourd’hui » en terre cuite), Activités (Je participe / J’organise · À venir / Passées ; le contrôle segmenté avec Archivées n’est pas encore dans le kit, voir le README du système), Annonces (AG, sondage, travaux, information).
- **Fiche d’activité** : « Voir la fiche » ou « Je participe » depuis l’Accueil ; « Je participe, avec N personnes » inscrit et mène à Activités, « Annuler » retire l’inscription.
- **Menu du profil** : l’avatar marine, présent sur tous les écrans, ouvre la feuille du bas (Profil, Mon syndic, Ma copro).
- **Profil** et ses rubriques : Mon compte (email, mot de passe, déconnexion, suppression du compte avec confirmation), Mes informations (visibilité champ par champ), Mes intérêts, Mes réglages (taille des caractères, apparence).
- **Formulaires** : Modifier l’email, le mot de passe, mes informations (barre « Retour » en haut, « Enregistrer » fixe en bas).

La pile de navigation : les écrans principaux remplacent la pile, les autres s’empilent (le retour dépile). « Grands caractères » pose `data-taille="grands"` sur le cadre, « Sombre » pose `data-theme="sombre"`.

## Pas encore maquetté
J’organise, Passées et Archivées, Mon syndic, Ma copro, Mes intérêts.

## À définir
Étiquettes des activités (Accessibilité, Pour qui…) : listes fermées à définir. « Accès plain-pied » et « Enfants bienvenus » sont provisoires.
