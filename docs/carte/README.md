# Catalogue des modules de coMunity

Ce qui répond à « qu'est-ce qui intervient dans l'inscription à une activité ? » sans lire le code : cinq **modules** (une capacité chacun, nommée par ce qu'elle sait faire), l'**emplacement** de chacun (fichiers, dossiers, migrations, au commit lu), ce qu'il promet, et les six étapes de la vie d'une activité qui s'en servent. Le format est celui de la carte de la boucle de livraison (`docs/carte-boucle/README.md` de son dépôt `fakossa-c/boucle`, § Le découpage, § Le format de `carte.json`, § Les modules).

## Ce que contient le dossier

- `fragments/` : le catalogue écrit à la main. Seul ce dossier se modifie.
  - `plan.json` : l'en-tête (commit lu : `lu_dans_le_code`), le couloir « La vie d'une activité », les six étapes (Proposer, Modérer, Publier, S'inscrire, Se retrouver, Donner son retour) avec leur contrat (but, déclencheur, entrées, sorties, version 1), les flèches entre elles et le parcours « Une activité, de sa proposition à ses retours ». `couleur` y est une clé de la page de la carte, pas un texte.
  - `modules/<nom>.json` : le module `module:<nom>`, ses emplacements, les liens `utilise` qui y mènent (une étape s'en sert ; preuve : le fichier qu'elle cite) et les liens `depend_de` qui en partent (preuve : le fichier qui importe et le fichier importé), tous de statut `declaree`, lus à la main. Le module de l'inscription porte en plus un contrat complet (préconditions, invariants, erreurs prévues avec leur message) ; chaque invariant nomme dans son texte la contrainte de base ou le test qui le fait respecter.
  - `decisions.json` : les fiches de `docs/adr/` et leurs liens `justifie`. La fiche 0001 décrit des rôles en données que le code n'a pas encore (il garde deux rôles, `syndic` et `resident`, et l'état du compte) : son lien vers « Les rôles et permissions » est donc `inferee`, à passer en `declaree` quand le code la suit.
- `carte.json` : le catalogue compilé, versionné, identique à ce que donnent les fragments. Il ne se modifie jamais à la main.

## Recompiler et contrôler

À relancer quand un emplacement change (fichier renommé, déplacé ou supprimé), qu'un module s'ajoute, ou qu'une étape change de promesse, depuis le dossier du projet :

```bash
node "$HOME/Projets perso/boucle/docs/carte-boucle/compiler-carte.mjs" docs/carte/fragments
node "$HOME/Projets perso/boucle/docs/carte-boucle/controle-structure.mjs" docs/carte/carte.json
```

`compiler-carte.mjs docs/carte/fragments --verifier` échoue si `carte.json` diffère des fragments. Les deux programmes sont ceux de la boucle, jamais copiés ici ; la prise d'un dossier en argument vient de l'issue 344 de `fakossa-c/boucle`. Le dossier des fragments ne contient que des fragments : le compilateur refuse un fichier hors du découpage, c'est pourquoi `README.md` et `carte.json` sont à côté de `fragments/`, et non dedans.

Après un changement de code, mettre à jour l'emplacement concerné et le commit lu (`lu_dans_le_code.commit` et le `commit` de chaque emplacement relu), puis recompiler.

## Règle de lecture

Ni la boucle ni coMunity ne lisent ce catalogue pour fonctionner : il se lit, il se recalcule à l'intégration, et rien n'en dépend à l'exécution. Le contrôle `Tests` ne le rejoue pas encore ; la page qui l'affichera vient de la carte de la boucle (issue 256 de `fakossa-c/boucle`).

## Ce que le catalogue ne fait pas

- Il ne sépare pas ce que mêle un même fichier : `src/app/activites/[identifiant]/actions.ts` réunit l'inscription, l'annulation et la suppression d'une activité, et le retour. Il est un emplacement du module de l'inscription, et un lien `depend_de` qui passe par lui est à relire.
- Il ne relit pas le code : un chemin cité qui disparaît ou un import qui change ne se voit qu'à la prochaine relecture à la main.
- Il ne cite que les modules de la vie d'une activité. Le tableau de bord du conseil syndical, les annonces, les sondages et le règlement intérieur ne sont pas encore des modules.
