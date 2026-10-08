## Branches

- Branche d'intégration : `develop` (branche par défaut sur GitHub). Worktrees et PRs de tickets partent de `develop` et y reviennent.
- `main` = production. La fusion `develop` → `main` est décidée par l'utilisateur.
- Hors-produit (l'agent fusionne lui-même) : PR qui ne touche que `CLAUDE.md`, `docs/` ou l'outillage (CI, hooks, config de lint et de test).
- Utilisateurs réels : aucun, jusqu'à l'ouverture aux résidents. D'ici là, l'agent fusionne aussi les PR de tickets et pousse les migrations distantes sans confirmation.

## Supabase distant

- Les previews Vercel et la production partagent un seul projet Supabase Cloud, durablement (plan gratuit, pas de projet dédié aux previews) : toute écriture sur son schéma ou ses données touche la production.
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

- Prérequis des tests base et navigateur : Docker Desktop lancé, puis `npx supabase start`. Le Supabase de coMunity écoute sur les ports 544xx (API `54421`, Studio `54423`, boîte mail `54424`) pour cohabiter avec un autre projet Supabase local sur 543xx. Storage y est activé (photo et PDF des annonces, photos des activités) ; Realtime y est coupé, faute d'usage : le ticket qui s'abonne à un canal le réactive dans `supabase/config.toml`.
- Worktree : juste après sa création, dans son dossier, `node scripts/isoler-supabase-worktree.mjs` (conteneur Docker et ports propres, Studio coupé, `config.toml` masqué pour git, lien Vercel recopié), puis `npx supabase start` et `npm run env:local`. Sans cette isolation, tous les checkouts pilotent le même conteneur, et un hook du projet bloque `supabase start`, `stop` et `db reset`.
- Chaque Supabase local démarré occupe environ 300 Mo : `npx supabase stop` dans le worktree dès sa PR ouverte.
- `npm run env:local` : écrit `.env.local` avec l'URL, la clé publiable et la clé secrète du Supabase local. À relancer après chaque `npx supabase start` sur une machine neuve.
- `npm test` : suite complète (format Prettier, unitaires, base de données, navigateur mobile et desktop ; un écart de format se corrige avec `npm run format`). À lancer avant d'ouvrir une PR, pour un retour rapide ; la barrière est le contrôle `Tests` de GitHub Actions (`.github/workflows/tests.yml`), qui relance la même suite sur chaque PR vers `develop` et `main`.
- Preview : `vercel curl` avec le lien `.vercel/project.json` (recopié par l'isolation du worktree ; absent, `vercel link --yes --project comunity`, sinon un projet fantôme est créé au nom du dossier). Sous Windows, depuis PowerShell : Git Bash convertit le chemin `/` en chemin Windows.
- Ciblées : `npm run test:unit`, `npm run test:db`, `npm run test:e2e`, ou `npx vitest run <fichier>`.
- `npm run typecheck`, `npm run lint`, `npm run format`.
- `node scripts/orch/lancer.mjs <n> [--dry-run] [--en-parallele 205,207]` : lance la session de fond du ticket (assignation, tableau, worktree, Supabase isolé et démarré, prompt, session `ticket-<n>`). Il démarre le Supabase du worktree : un seul à la fois. Valeurs du projet dans `.claude/orchestration.json`, valeurs de la machine dans `.claude/orchestration.local.json` (ignoré par git).
- `node scripts/orch/cloturer.mjs <n> [--dry-run]` : clôt un ticket dont la PR est fusionnable (vérification `verifier-pr.mjs`, fusion sur le commit de tête, `develop` à jour, poussée des migrations si la PR porte le label `migration` et que `pousserMigrationsApresFusion` le permet, ticket et spec fermés, session, Supabase et worktree retirés). Elle écrit sur GitHub, Docker et le Supabase distant : l'essayer en `--dry-run` sur un ticket déjà clos. Relancée après un échec, elle reprend sans refaire ce qui est fait.
- `node scripts/orch/boucle.mjs (--spec <n> | --tickets a,b,c | --tous) [--dry-run] [--etat <dossier>]` : la salve entière à la place de l'orchestrateur - elle lance, vérifie, fusionne et clôture chaque ticket (les quatre scripts ci-dessus, appelés comme des fonctions), puis s'arrête quand tout est clos. Elle reprend aussi les sessions (réponse à un `needs-info` retiré, CI rouge deux fois au plus, échec de session après attente croissante) et borne leur durée et leur inactivité, selon `.claude/orchestration.json`. À lancer depuis le checkout principal, propre et sur `develop`. Un tour toutes les `intervalleBoucleSecondes` de `.claude/orchestration.json` ; journal `boucle.log` et verrou `boucle.verrou.json` dans le dossier d'état du projet. `--dry-run` décide un tour sans rien modifier ; `--etat` pointe un dossier d'état d'essai.
- Boucle détachée du terminal : VM, `tmux new-session -d -s boucle-comunity "node scripts/orch/boucle.mjs --spec <n>"` et `tmux send-keys -t boucle-comunity C-c` pour l'arrêter proprement (les sessions de fond continuent, une relance reprend) ; PC, PowerShell `Start-Process node -ArgumentList "scripts/orch/boucle.mjs --spec <n>" -WindowStyle Hidden`.
- `npx supabase db reset` : rejoue les migrations de `supabase/migrations/` et `supabase/seed.sql`.
- Une modification de `supabase/config.toml` (modèles d'email, limites d'Auth) ne s'applique qu'après `npx supabase stop` puis `npx supabase start`.
- `npm run syndic:amorcer -- <email> <mot-de-passe> <prénom> <nom>` : crée le premier membre du syndic (lit `.env.local`). Les suivants arrivent par invitation depuis l'espace syndic.
- `npm run demo:amorcer` : comptes de test `fakossa+test-<rôle>-<username>@gmail.com` (syndic, résidents validés, en attente, refusé, retiré), avec activités dans chaque état, annonces et sondages ; relançable sans doublon. Sur le Supabase local par défaut ; pour le distant, passer `NEXT_PUBLIC_SUPABASE_URL` et `SUPABASE_SECRET_KEY` devant la commande et ajouter `-- --distant`.
- `npm run demo:retirer` : supprime ces comptes et leurs données, eux seuls. À lancer avant l'ouverture aux vrais résidents : leur mot de passe se devine.

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
