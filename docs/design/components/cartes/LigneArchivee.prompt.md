Une activité passée dans « Archivées » (Activités), en ligne : pictogramme dans un rond `surface-container` (48 px, 56 sur ordinateur), titre en lien vers la fiche (`headline-sm`), « jour · lieu » en 16 px discret, puis une `Etiquette` de rôle : « Organisée par vous » (pêche, `edit`) ou « Vous y avez participé » (verte, `event_available`). Une activité organisée puis annulée ajoute l'`Etiquette` « Annulée » (ton `erreur`) et n'affiche plus de participants.

Actions : « Organisée par vous » → « N participants » (accompagnants compris, en 16 px discret) puis `Bouton` contour « Dupliquer » (`content_copy`, ouvre Proposer prérempli sans la date) ; « Vous y avez participé » → `Bouton` contour « Donner mon avis » (ouvre la fiche, où se trouve le formulaire). Sur ordinateur, les actions sont à droite de la ligne et le survol teinte le fond (`surface-container-low`, 0,35 s) ; sur mobile, elles passent sous le texte. Les lignes s'empilent dans une carte de liste (`fond-carte`, sans contour sur ordinateur, ombre douce), sans filet visible sur ordinateur.

```jsx
<LigneArchivee role="suivie" titre="Café des voisins" jour="Jeudi 15 octobre" lieu="Hall principal, RDC" pictogramme="coffee" />
<LigneArchivee role="organisee" titre="Troc de graines et de plants" jour="Samedi 10 octobre" lieu="Jardin partagé" pictogramme="potted_plant" participants={9} />
```
