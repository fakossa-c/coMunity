# coMunity - product brief

Ce document dit pourquoi coMunity existe, pour qui, et comment savoir s'il marche. Le détail de ce que fait l'app est dans la spec #1, le vocabulaire dans `CONTEXT.md`, les décisions difficiles à défaire dans `docs/adr/`. L'avancement se suit sur les issues GitHub, jamais ici.

## Problème

Aux Reflets de l'Ourcq (5 bâtiments, environ 200 logements), la vie collective passe par un groupe WhatsApp qui dit tout et n'importe quoi. Une proposition d'activité s'y noie, on ne sait plus qui vient ni où. Une information utile y est impossible à retrouver une semaine plus tard. Les documents de la résidence (règlement intérieur, contrats, consignes) sont introuvables quand on en a besoin.

## Vision

Un endroit unique, sous la main et très simple à consulter, où les voisins se retrouvent autour d'activités et où chacun retrouve en quelques secondes l'information et les documents de la résidence.

Deux promesses, dans cet ordre d'importance :

1. **Les activités** sont la raison d'être : des voisins qui proposent des moments et s'y retrouvent. Si l'on devait couper, on garderait celle-là.
2. **Le point central d'information** (annonces, documents, Ma copro) est ce qui rend l'app utile tous les jours, même sans activité prévue.

coMunity ne remplace pas le groupe WhatsApp : il en est la source de vérité, et WhatsApp le porte-voix. On y poste des liens qui ramènent vers l'app, pas l'information elle-même.

## Pour qui

Toute personne majeure qui habite la résidence, copropriétaire ou locataire, de 30 à 70 ans. Les mineurs viennent en accompagnants d'un résident.

| Persona | Ce qu'il cherche | Ce qui le freine |
|---|---|---|
| **Parent d'environ 40 ans** (persona principale) | Des moments simples avec ses enfants et les voisins, sans organiser lui-même ; retrouver vite une information pratique. | Peu de temps ; ne lit plus le groupe WhatsApp. |
| **Personne qui vit seule** | Se divertir, rencontrer ses voisins, avoir une raison de sortir de chez soi. | N'ose pas se proposer ; ne sait pas qui vient. |
| **Membre du conseil syndical** | Informer tous les résidents au même endroit et voir la résidence s'animer. | Bénévole, peu de temps ; n'a pas choisi l'outil. |
| **Porteur de projets** (l'équipe coMunity) | Lancer des initiatives (nettoyage des parties communes, goûters) et voir qui s'y joint. | Seul au départ ; sans mandat officiel. |

## Proposition de valeur

- **Parent** : « Je vois en un coup d'œil ce qui se passe cette semaine dans la résidence, et je m'inscris avec les enfants en un geste. »
- **Personne seule** : « Je sais qui vient avant d'y aller, et proposer mon propre moment ne me prend que quelques minutes. »
- **Conseil syndical** : « Mon information arrive à tout le monde et reste trouvable, sans passer par le fil du groupe WhatsApp. »
- **Porteur de projets** : « Ma proposition ne se noie pas : elle a sa fiche, son lien et sa liste d'inscrits. »

## Rôles

Trois rôles de départ, cumulables, qui ajoutent des permissions au socle Résident (voir `docs/adr/0001-roles-et-permissions-en-donnees.md`) :

| | Résident | Conseil syndical | Équipe coMunity |
|---|---|---|---|
| S'inscrire, proposer une activité | oui | oui | oui |
| Publier annonces, sondages, documents, Ma copro | non | oui | oui, signé « équipe coMunity » |
| Valider ou refuser un résident | non | oui | oui |
| Modérer les activités | non | oui | oui |
| Lieux, heure de calme | non | oui | oui |
| Tableau de bord | non | oui | oui |
| Nommer ou retirer un membre des autres rôles | non | non | oui |

Sur une carte, les résidents voient « Proposée par le conseil syndical » ou « Proposée par l'équipe coMunity » ; une activité de voisin n'a pas de bandeau.

## Lancement

1. **Présenter coMunity au conseil syndical** et obtenir son soutien. S'il ne suit pas, le projet continue en initiative de résident.
2. **Préparer le contenu** : le règlement intérieur et les documents les plus demandés en ligne, au moins 3 activités programmées sur les 4 semaines suivantes (par l'équipe coMunity et le conseil syndical).
3. **Annoncer sur le groupe WhatsApp**, par un message signé de l'équipe coMunity et du conseil syndical, avec le lien de la première activité.

## Mesure du succès

**Indicateur principal : participants distincts par mois**, le nombre de résidents différents inscrits à au moins une activité qui a eu lieu dans le mois. Il mesure du lien réel entre des personnes différentes, pas l'assiduité de quelques habitués.

Indicateurs secondaires :

- **Comptes validés**, rapportés aux environ 200 logements.
- **Part des activités proposées par des résidents** hors conseil syndical et équipe coMunity : le signe que l'app vit sans ceux qui l'ont lancée.
- **Consultation** : visites et pages vues par rubrique (Documents, Ma copro, Annonces), par une mesure d'audience anonyme et sans cookie.

| Depuis le lancement | Comptes validés | Participants distincts par mois | Autre |
|---|---|---|---|
| 3 mois | 50 | 15 | |
| 6 mois | 80 | 25 | au moins un tiers des activités proposées par des résidents |
| 12 mois | 100 | 40 | |

Ces cibles sont des ordres de grandeur, à réviser après le premier trimestre.

**Au-delà du pilote** : on envisage d'ouvrir coMunity à d'autres résidences seulement si les cibles à 6 mois sont atteintes **et** qu'une autre résidence demande l'app.

## Périmètre du pilote

**Must have** : sans eux, pas de lancement.

- Comptes du conseil syndical et des résidents, validation (#4, #5)
- Rôles et permissions en données (à spécifier)
- Proposer une activité, fiche publique et relais WhatsApp, inscription (#6, #9, #7, #8)
- Accueil par jour (#15)
- Annonces (#13)
- Documents : consultation rapide, classés par type (à spécifier)
- Ma copro et page du conseil syndical (#43, #42)
- Modération (#14)
- Cadre des écrans et design system (#34 et ses tickets)
- Identifiants et suppression du compte (#40, #41)
- Mesure d'audience anonyme (à spécifier)

**Should have** : attendus dans les trois premiers mois.

- Gestion d'une activité par son créateur : modifier, dupliquer, annuler (#12)
- Photos d'activité (#10)
- Lieux de la résidence et règles de l'assistant (#11)
- Tableau de bord, qui calcule l'indicateur principal (#17)
- Sondages (#39)
- Profil, réglages, affichage sur ordinateur (#18, #19, #38)

**Could have**

- Retours après une activité (#16)
- Jev : catégorisation, pictogramme, pré-modération (#20)

## Hypothèses à valider

| Hypothèse | Comment on le saura |
|---|---|
| Le conseil syndical soutient coMunity et y publie. | Son accord au premier jalon, puis au moins une annonce ou un document publié par lui dans le premier mois. |
| Les résidents rejoignent l'app depuis un lien posté sur WhatsApp. | 50 comptes validés à 3 mois. |
| Des résidents hors équipe proposent des activités d'eux-mêmes. | Un tiers des activités à 6 mois. |
| Les documents et les infos pratiques sont réellement consultés. | Pages vues des rubriques Documents et Ma copro, mois après mois. |
| Le groupe WhatsApp accepte des liens à la place de l'information brute. | Observation du groupe : les messages d'information renvoient-ils vers coMunity ? |

## Hors périmètre

- Remplacer le groupe WhatsApp.
- Plusieurs résidences dans une même instance, tant que le signal « au-delà du pilote » n'est pas atteint.
- Comptes pour les mineurs.
- Documents contenant des données personnelles (procès-verbaux non anonymisés, impayés, litiges), et documents réservés aux seuls copropriétaires.
- Écran de gestion des rôles, tant qu'aucun quatrième rôle n'est demandé.
- Tout ce que la spec #1 exclut déjà : messagerie entre voisins, notifications hors authentification, réservation de salles, application native, texte rédigé par une IA.
