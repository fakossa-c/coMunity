# Supabase local partagé entre worktrees (ticket #7, 25/09/2026)

- **Ce qui s'est passé** : pendant la reprise du ticket #7, trois `supabase db reset` et un `supabase stop --no-backup` ont visé le conteneur `comunity`, que les worktrees des tickets #40 et #47 utilisaient aussi. Leurs tests en cours ont pu tomber et leurs données locales ont été effacées. Les tests du ticket #7 échouaient de leur côté, la base changeant de migrations entre deux lancements.
- **Pourquoi le process l'a raté** : `supabase/config.toml`, versionné, donne le même `project_id` et les mêmes ports à chaque worktree. Rien ne signalait qu'un autre worktree pilotait le même conteneur, et l'agent n'a pas vérifié le nom du projet Docker avant d'agir.
- **Règle** : chaque worktree de ticket isole son Supabase juste après sa création (`node scripts/isoler-supabase-worktree.mjs`, puis `git update-index --skip-worktree supabase/config.toml`).
- **Où elle est écrite** : `CLAUDE.md`, section « Commandes », et la règle générique dans la méthode commune (section « Worktrees »).
- **Suite (26/09/2026)** : le script accepte tout worktree et pose lui-même le `skip-worktree`. Un hook du projet (`scripts/garde-supabase.mjs`) bloque `supabase start`, `stop` et `db reset` dans un worktree dont le `project_id` est encore `comunity` : l'oubli ne passe plus en silence.
