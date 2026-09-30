# coMunity

La vie collective d'une résidence en copropriété : des voisins qui proposent des activités et s'y retrouvent, et un point central où retrouver vite l'information de la résidence.

## Language

### Personnes

**Résident** :
Toute personne majeure qui habite la résidence, copropriétaire ou locataire, avec un compte validé par le conseil syndical. Un mineur vient en accompagnant.
_Avoid_ : copropriétaire, habitant, utilisateur

**Pseudo** :
Le seul nom sous lequel les voisins voient un résident, membre du conseil syndical compris. Prérempli avec son prénom et l'initiale de son nom (« Danielle M. »), il le modifie librement. Le prénom et le nom réels, demandés à l'inscription, ne servent qu'au conseil syndical pour valider le compte.
_Avoid_ : nom affiché, surnom, nom d'utilisateur

**Conseil syndical** :
Les copropriétaires élus et bénévoles qui habitent la résidence. Ceux qui ont un compte y portent l'information officielle de la copropriété.
_Avoid_ : syndic (pour ce rôle), admin, gestionnaire

**Équipe coMunity** :
Les résidents qui font vivre et administrent coMunity dans la résidence, sans mandat du conseil syndical.
_Avoid_ : admin, équipe d'animation, modérateur

**Syndic** :
Le mandataire, souvent un cabinet extérieur, qui gère la copropriété. Il n'agit pas dans coMunity ; on le présente seulement aux résidents.
_Avoid_ : conseil syndical

**Rôle** :
Un ensemble nommé de permissions attribué à des personnes, éventuellement pour une durée limitée. Une personne cumule ses rôles ; Résident est le socle de toute personne validée.
_Avoid_ : statut, profil, groupe

**Permission** :
Une action de la résidence qu'un rôle autorise, comme publier une annonce ou valider un résident. Le catalogue des permissions est fixe ; les rôles se composent librement à partir de lui.
_Avoid_ : droit, accès

### Vie de la résidence

**Résidence** :
L'ensemble d'immeubles d'une même copropriété, et le périmètre d'une instance de coMunity.
_Avoid_ : copro, immeuble

**Espace commun** :
Un lieu de la résidence défini par le conseil syndical (salle commune, cour, jardin), avec ses horaires d'accès, son contact et ses règles, où une activité peut se tenir. Il peut porter plusieurs photos (la première illustre sa carte), ses dimensions (longueur et largeur, ensemble), sa hauteur sous plafond et un **plan de situation** (une image qui montre où il se trouve dans la résidence).
« Biens communs » n'est qu'un libellé visible de l'interface (l'entrée « Espaces, biens communs et règlement » du menu, le titre de section « Espaces et biens communs » de Ma copro) ; dans le code, les tickets et la base, le terme du domaine reste **espace commun**.
_Avoid_ : salle, salle partagée, espace copro, bien commun (hors de ces deux libellés)

**Lieu libre** :
Le lieu d'une activité qui se tient hors des espaces communs, saisi par son créateur (« chez Danielle, 2e étage »).
_Avoid_ : autre lieu

**Activité** :
Un moment proposé par un résident ou le conseil syndical, à une date et dans un lieu, auquel les résidents s'inscrivent. C'est la raison d'être de coMunity. Une activité du conseil syndical se présente comme celle d'un voisin.
_Avoid_ : événement, atelier (qui n'est qu'un genre d'activité)

**Description** :
Le texte qui présente une activité : ce qu'on y fait, pour qui, comment venir. 600 caractères au plus ; c'est le bloc « Description » de la fiche et le texte de l'aperçu dans Proposer. Distincte du mot d'accueil.
_Avoid_ : détails, présentation

**Mot d'accueil** :
Le mot personnel de l'organisateur à ses voisins, en encart en tête de la fiche d'une activité. 300 caractères au plus. Distinct de la description.
_Avoid_ : message d'accueil, introduction

**Annonce** :
Une information publiée pour les résidents par le conseil syndical ou l'équipe coMunity, sans inscription, qui dit « il y a du nouveau » et vieillit.
_Avoid_ : actualité, post, message

**Sondage** :
Une question à choix unique jointe à une annonce par le conseil syndical, avec ses options et une date limite. Un résident validé y répond une seule fois, sans pouvoir changer sa réponse ; il lit les résultats après avoir répondu, et tout le monde les lit après la date limite.
_Avoid_ : enquête, scrutin

**Règlement intérieur** :
Les règles de vie communes de la résidence, présentées dans Ma copro en sections qu'on déplie.
_Avoid_ : règlement de copropriété (le texte juridique qui fixe les droits des copropriétaires), document

**Tableau de bord** :
La page où le conseil syndical suit, sur une période, ce qui fait vivre la résidence : activités, inscriptions, participants distincts, remplissage, activités les mieux notées, comptes validés et en attente. Seules comptent les activités publiées et terminées, celles qui ont eu lieu.
_Avoid_ : statistiques, dashboard, analytics

**Participants distincts** :
Le nombre de résidents différents inscrits à au moins une activité qui a eu lieu sur la période. C'est l'indicateur principal : il mesure du lien réel entre des personnes différentes, pas l'assiduité de quelques habitués.
_Avoid_ : utilisateurs actifs, fréquentation

**Taux de remplissage** :
La part des places d'une activité prises par ses inscrits, accompagnants compris. Une activité sans limite de places n'en a pas ; le taux d'un groupe d'activités est la moyenne des taux de celles qui en ont un.
_Avoid_ : taux de participation
