## Branches

- Branche d'intégration : `develop` (branche par défaut sur GitHub). Worktrees et PRs de tickets partent de `develop` et y reviennent.
- `main` = production. La fusion `develop` → `main` est décidée par l'utilisateur.
- Hors-produit (l'agent fusionne lui-même) : PR qui ne touche que `CLAUDE.md`, `docs/` ou l'outillage (CI, hooks, config de lint et de test).

## Supabase distant

- Les previews Vercel et la production partagent un seul projet Supabase Cloud : toute écriture sur son schéma ou ses données touche la production. Chacune attend l'accord de l'utilisateur.
- Une PR qui ajoute une migration a une preview en erreur sur les écrans concernés tant que la migration n'est pas sur ce projet : sa vérification de preview attend cet accord.
- Une migration s'y applique avec `npx supabase db push` (procédure dans `docs/deploiement.md`, section 1), qui tient l'historique des migrations à jour. Une migration exécutée à la main dans l'éditeur SQL se déclare ensuite avec `npx supabase migration repair --status applied <version>`.

## Compte GitHub

- Le dépôt appartient à `fakossa-c`, alors que le compte `gh` actif de la machine est `fakossa`, sans droits ici. Chaque commande `gh` sur ce dépôt s'exécute avec le jeton de `fakossa-c` : `GH_TOKEN=$(gh auth token -u fakossa-c) gh ...` (PowerShell : `$env:GH_TOKEN = gh auth token -u fakossa-c` avant la commande).
- `git push` passe par une configuration locale au dépôt. Sur un nouveau clone, la poser une fois :
  `git config --local credential.https://github.com.helper ""` puis
  `git config --local --add credential.https://github.com.helper '!f() { test "$1" = get || exit 0; echo username=fakossa-c; echo "password=$(gh auth token -u fakossa-c)"; }; f'`

## Commandes

- Prérequis des tests base et navigateur : Docker Desktop lancé, puis `npx supabase start`. Le Supabase de coMunity écoute sur les ports 544xx (API `54421`, Studio `54423`, boîte mail `54424`) pour cohabiter avec un autre projet Supabase local sur 543xx.
- Worktree de ticket : les worktrees partagent sinon le même conteneur Docker et les mêmes ports 544xx, ce qui casse les tests d'un ticket pendant qu'un autre tourne. Juste après la création du worktree, dans son dossier : `node scripts/isoler-supabase-worktree.mjs` (attribue un `project_id` et des ports dédiés au ticket) puis `git update-index --skip-worktree supabase/config.toml` (ne jamais commiter ces ports isolés), puis `npx supabase start` et `npm run env:local`.
- `npm run env:local` : écrit `.env.local` avec l'URL, la clé publiable et la clé secrète du Supabase local. À relancer après chaque `npx supabase start` sur une machine neuve.
- `npm test` : suite complète (unitaires, base de données, navigateur mobile et desktop). À lancer avant d'ouvrir une PR.
- Ciblées : `npm run test:unit`, `npm run test:db`, `npm run test:e2e`, ou `npx vitest run <fichier>`.
- `npm run typecheck`, `npm run lint`, `npm run format`.
- `npx supabase db reset` : rejoue les migrations de `supabase/migrations/` et `supabase/seed.sql`.
- Une modification de `supabase/config.toml` (modèles d'email, limites d'Auth) ne s'applique qu'après `npx supabase stop` puis `npx supabase start`.
- `npm run syndic:amorcer -- <email> <mot-de-passe> <prénom> <nom>` : crée le premier membre du syndic (lit `.env.local`). Les suivants arrivent par invitation depuis l'espace syndic.

## Next.js 16

@AGENTS.md

## Agent skills

### Issue tracker

Les issues vivent sur GitHub Issues (`github.com/fakossa-c/coMunity`), via la CLI `gh`. Voir `docs/agents/issue-tracker.md`.

### Triage labels

Labels par défaut, inchangés : `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. Voir `docs/agents/triage-labels.md`.

### Domain docs

Layout single-context : `CONTEXT.md` et `docs/adr/` à la racine. Voir `docs/agents/domain.md`.
