## Branches

- Branche d'intégration : `develop` (branche par défaut sur GitHub). Worktrees et PRs de tickets partent de `develop` et y reviennent.
- `main` = production. La fusion `develop` → `main` est décidée par l'utilisateur.
- Hors-produit (l'agent fusionne lui-même) : PR qui ne touche que `CLAUDE.md`, `docs/` ou l'outillage (CI, hooks, config de lint et de test).

## Commandes

- Prérequis des tests base et navigateur : Docker Desktop lancé, puis `npx supabase start`. Le Supabase de coMunity écoute sur les ports 544xx (API `54421`, Studio `54423`, boîte mail `54424`) pour cohabiter avec un autre projet Supabase local sur 543xx.
- `npm run env:local` : écrit `.env.local` avec l'URL et la clé du Supabase local. À relancer après chaque `npx supabase start` sur une machine neuve.
- `npm test` : suite complète (unitaires, base de données, navigateur mobile et desktop). À lancer avant d'ouvrir une PR.
- Ciblées : `npm run test:unit`, `npm run test:db`, `npm run test:e2e`, ou `npx vitest run <fichier>`.
- `npm run typecheck`, `npm run lint`, `npm run format`.
- `npx supabase db reset` : rejoue les migrations de `supabase/migrations/` et `supabase/seed.sql`.

## Next.js 16

@AGENTS.md

## Agent skills

### Issue tracker

Les issues vivent sur GitHub Issues (`github.com/fakossa-c/coMunity`), via la CLI `gh`. Voir `docs/agents/issue-tracker.md`.

### Triage labels

Labels par défaut, inchangés : `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. Voir `docs/agents/triage-labels.md`.

### Domain docs

Layout single-context : `CONTEXT.md` et `docs/adr/` à la racine. Voir `docs/agents/domain.md`.
