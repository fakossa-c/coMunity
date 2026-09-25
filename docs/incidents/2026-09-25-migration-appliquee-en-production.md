# Migration appliquée en production avant le merge (ticket #7, 25/09/2026)

- **Ce qui s'est passé** : la preview de la PR du ticket #7 répondait en erreur sur la fiche d'activité, la fonction `fiche_activite` manquant sur le Supabase distant. La migration `20260924200000_fiche_publique.sql` a été collée à la main dans l'éditeur SQL de ce projet, alors que `main` ne contenait pas encore le code. Ce projet est aussi celui de la production.
- **Pourquoi le process l'a raté** : l'agent a présenté ce projet comme « le Supabase des previews », sans lire que les variables Vercel valent pour Production et Preview à la fois. L'accord demandé à l'utilisateur ne mentionnait donc pas la production. Collée à la main, la migration n'est pas inscrite dans l'historique distant : un futur `supabase db push` voudra la rejouer et échouera.
- **Conséquence** : sans effet visible pour la production, la migration ne faisant qu'ajouter (une colonne avec valeur par défaut, deux fonctions). À régulariser avec `npx supabase migration repair --status applied 20260924200000`.
- **Règle** : toute écriture sur le Supabase distant touche la production et attend l'accord de l'utilisateur ; une migration s'y applique avec `supabase db push`.
- **Où elle est écrite** : `CLAUDE.md`, section « Supabase distant ».
- **Reste ouvert** : la preview d'une PR avec migration est en erreur tant que la production n'a pas le nouveau schéma. Une base Supabase distincte pour les previews lèverait cette contrainte.
