# Notes design-sync (coMunity)

## Construction

- coMunity est une app Next.js, pas une bibliothèque : `build-ds.mjs` fabrique un paquet `comunity-ds` dans `.design-sync/.cache/pkg` (non versionné). Il copie les composants de présentation (`COMPOSANTS`), les compile avec tsc et compile la feuille de styles depuis `src/app/globals.css` avec Tailwind. Toujours le relancer avant le convertisseur (`buildCmd`).
- Commande complète depuis la racine du dépôt : `node .design-sync/build-ds.mjs` puis `node .ds-sync/resync.mjs --config .design-sync/config.json --node-modules ./node_modules --entry .design-sync/.cache/pkg/dist/index.js --out ./ds-bundle [--remote .design-sync/.cache/remote-sync.json]`.
- Périmètre choisi par l'utilisateur : charte + briques simples (`Icone`, `TitrePage`, `Bientot`). Exclus volontairement : `EnTete` (lit la base côté serveur), `NavigationPrincipale` (routeur Next.js, et navigation en cours de refonte), `AideInstallation`.
- Feuille de styles : `@theme static` émet toutes les variables de la charte ; `@import "tailwindcss" source(none)` limite les classes à celles des composants copiés et des aperçus (`@source`). La palette par défaut de Tailwind n'est pas émise, exprès.
- Polices : l'app passe par `next/font` ; ici, `@import` Google Fonts en tête de feuille et `--font-plus-jakarta` / `--font-atkinson` définies à la main. `[FONT_REMOTE]` est donc attendu.
- Guides : `docs/design/warm_commons/DESIGN.md` et `.design-sync/guidelines/intention-app.md` sont copiés à la racine du paquet puis ramassés par `guidelinesGlob: ["*.md"]`. Les mettre dans un sous-dossier du paquet donnait `guidelines/guidelines/`.
- `finalize_plan` refuse un `localDir` relatif résolu depuis un autre dossier que le worktree : passer le chemin absolu de `ds-bundle`.

## Known render warns

Aucun.

## Re-sync risks

- `intention-app.md` recopie des décisions produit (navigation Accueil / Mes activités / Annonces, bouton « + », avatar) qui ne sont pas encore dans la spec #1 ni dans le code. À tenir à jour à chaque décision de design.
- `conventions.md` nomme des variables CSS et la seule classe de taille livrée (`size-7`) : revalider contre `_ds_bundle.css` après tout changement de `globals.css` ou des aperçus.
- Les unions de `nom` (pictogrammes) suivent `src/components/icones.ts` : un ajout d'icône dans l'app change `Icone.d.ts` et relance la vérification d'`Icone`.
- `build-ds.mjs` échoue exprès si `globals.css` perd `@import "tailwindcss";` ou `@theme {`.
