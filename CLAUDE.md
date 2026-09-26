## Branches

- Branche d'intégration : `develop` (branche par défaut sur GitHub). Worktrees et PRs de tickets partent de `develop` et y reviennent.
- `main` = production. La fusion `develop` → `main` est décidée par l'utilisateur.
- Hors-produit (l'agent fusionne lui-même) : PR qui ne touche que `CLAUDE.md`, `docs/` ou l'outillage (CI, hooks, config de lint et de test).

## Supabase distant

- Les previews Vercel et la production partagent un seul projet Supabase Cloud, durablement (plan gratuit, pas de projet dédié aux previews) : toute écriture sur son schéma ou ses données touche la production. Chacune attend l'accord de l'utilisateur.
- Une migration part en distant après la fusion de sa PR dans `develop`, depuis le checkout principal sur `develop` à jour : `npm run db:pousser` vérifie l'historique et liste ce qui partirait, puis `npm run db:pousser -- --appliquer` pousse. Un hook du projet bloque tout `supabase db push` direct.
- Avant la fusion, une PR à migration se vérifie sur le Supabase local (`npm test`) ; sa preview reste en erreur sur les écrans concernés jusqu'au push, puis se vérifie sur la preview de `develop`.
- Le code de `main` tourne sur cette base avant de recevoir `develop` : une migration ajoute sans retirer. Supprimer ou renommer une colonne, une table ou ce qu'une fonction renvoie, quand `main` s'en sert, attend la fusion `develop` → `main` ; `db:pousser` signale ces lignes.
- Une migration exécutée à la main dans l'éditeur SQL se déclare ensuite, depuis le checkout principal, avec `npx supabase migration repair --status applied <version>`.

## Compte GitHub

- Le dépôt appartient à `fakossa-c`, alors que le compte `gh` actif de la machine est `fakossa`, sans droits ici. Chaque commande `gh` sur ce dépôt s'exécute avec le jeton de `fakossa-c` : `GH_TOKEN=$(gh auth token -u fakossa-c) gh ...` (PowerShell : `$env:GH_TOKEN = gh auth token -u fakossa-c` avant la commande).
- `git push` passe par une configuration locale au dépôt. Sur un nouveau clone, la poser une fois :
  `git config --local credential.https://github.com.helper ""` puis
  `git config --local --add credential.https://github.com.helper '!f() { test "$1" = get || exit 0; echo username=fakossa-c; echo "password=$(gh auth token -u fakossa-c)"; }; f'`

## Commandes

- Prérequis des tests base et navigateur : Docker Desktop lancé, puis `npx supabase start`. Le Supabase de coMunity écoute sur les ports 544xx (API `54421`, Studio `54423`, boîte mail `54424`) pour cohabiter avec un autre projet Supabase local sur 543xx. Realtime et Storage y sont coupés, faute d'usage : le ticket qui stocke des fichiers réactive Storage dans `supabase/config.toml`.
- Worktree : juste après sa création, dans son dossier, `node scripts/isoler-supabase-worktree.mjs` (conteneur Docker et ports propres, Studio coupé, `config.toml` masqué pour git, lien Vercel recopié), puis `npx supabase start` et `npm run env:local`. Sans cette isolation, tous les checkouts pilotent le même conteneur, et un hook du projet bloque `supabase start`, `stop` et `db reset`.
- Chaque Supabase local démarré occupe environ 300 Mo : `npx supabase stop` dans le worktree dès sa PR ouverte.
- `npm run env:local` : écrit `.env.local` avec l'URL, la clé publiable et la clé secrète du Supabase local. À relancer après chaque `npx supabase start` sur une machine neuve.
- `npm test` : suite complète (unitaires, base de données, navigateur mobile et desktop). À lancer avant d'ouvrir une PR : c'est la seule barrière, aucune CI ne rejoue les tests avant octobre 2026 (quota GitHub Actions du plan gratuit).
- Ciblées : `npm run test:unit`, `npm run test:db`, `npm run test:e2e`, ou `npx vitest run <fichier>`.
- `npm run typecheck`, `npm run lint`, `npm run format`.
- `npx supabase db reset` : rejoue les migrations de `supabase/migrations/` et `supabase/seed.sql`.
- Une modification de `supabase/config.toml` (modèles d'email, limites d'Auth) ne s'applique qu'après `npx supabase stop` puis `npx supabase start`.
- `npm run syndic:amorcer -- <email> <mot-de-passe> <prénom> <nom>` : crée le premier membre du syndic (lit `.env.local`). Les suivants arrivent par invitation depuis l'espace syndic.

## Design system

- Tout écran et tout composant de `src/app/` et `src/components/` suit `docs/design/README.md` (couleurs, espacements, formes, états) et la fiche du composant dans `docs/design/components/<famille>/<Composant>.prompt.md`. Un composant qui a une fiche se livre dans `src/components/` d'après elle, jamais en version provisoire dans une page.
- Ces fichiers sont des standards de revue : `/code-review` relit contre eux toute PR qui touche `src/app/` ou `src/components/`.

## Next.js 16

@AGENTS.md

## Agent skills

### Issue tracker

Les issues vivent sur GitHub Issues (`github.com/fakossa-c/coMunity`), via la CLI `gh`. Voir `docs/agents/issue-tracker.md`.

### Triage labels

Labels par défaut, inchangés : `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. Voir `docs/agents/triage-labels.md`.

### Domain docs

Layout single-context : `CONTEXT.md` et `docs/adr/` à la racine. Voir `docs/agents/domain.md`.
