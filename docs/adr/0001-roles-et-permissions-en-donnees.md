# Rôles et permissions sont des données, pas un enum

coMunity doit pouvoir accueillir de nouveaux rôles, y compris éphémères (un rôle le temps d'une fête des voisins), et leur accorder les permissions voulues sans refonte. Les rôles sont donc des données : un rôle porte un nom public et une liste de permissions, une personne peut en cumuler plusieurs et reçoit la somme de leurs permissions, et une attribution peut avoir une date de fin. Les permissions, elles, forment un catalogue fixe défini dans le code, parce que chacune correspond à une action que l'app sait faire et que la base contrôle par ses règles d'accès.

Premier jeu de rôles : Résident (le socle de toute personne validée), Conseil syndical et Équipe coMunity. L'Équipe coMunity, non élue, a plus de droits que le Conseil syndical : elle opère la plateforme et seule nomme ou retire les membres des autres rôles. Ce qu'elle publie est signé « équipe coMunity », pour qu'un résident ne le prenne pas pour une parole officielle de la copropriété.

## Considered Options

- **Un enum `syndic` / `resident`** (l'existant) : plus simple, mais chaque nouveau rôle réécrit les règles d'accès de toutes les tables.
- **Des permissions libres, créées depuis l'app** : écarté, une permission sans code ni règle d'accès derrière ne fait rien.

## Consequences

- Les règles d'accès en base testent une permission (« peut publier une annonce »), jamais un nom de rôle.
- Le mot `syndic` du code et de la spec #1 désigne l'ancien rôle unique ; il disparaît avec la migration vers ce modèle.
