# coMunity : conventions pour concevoir avec Warm Commons

coMunity est l'app de vie d'une résidence (activités entre voisins, annonces du syndic). Public intergénérationnel, beaucoup de personnes âgées : lisibilité et grandes cibles avant tout. **Lire d'abord `guidelines/intention-app.md`** (pour qui, principes, organisation des écrans, décisions de navigation récentes) puis `guidelines/warm-commons.md` (la charte complète).

## Mise en place

Aucun provider : lier `styles.css` suffit. Il charge les polices (Plus Jakarta Sans pour les titres et libellés, Atkinson Hyperlegible Next pour le texte) et définit toutes les variables de la charte. Donner au conteneur de page le fond et la police de base :

```jsx
<div style={{ background: "var(--color-surface)", color: "var(--color-on-surface)", fontFamily: "var(--font-body)" }}>
```

## Styler : variables CSS de la charte

Les composants utilisent des classes utilitaires compilées, mais seules celles déjà employées existent : pour la mise en page, écrire les styles avec les variables `var(--*)` ci-dessous, jamais de couleur ni de taille en dur.

| Famille | Variables |
|---|---|
| Fonds | `--color-surface` (page), `--color-surface-container-lowest` (carte blanche), `--color-surface-container-low`, `--color-surface-container`, `--color-inverse-surface` (bouton marine) |
| Texte | `--color-on-surface`, `--color-on-surface-variant` (secondaire), `--color-inverse-on-surface` |
| Accent | `--color-primary` (terre cuite), `--color-on-primary`, `--color-primary-fixed` (pastille pêche), `--color-on-primary-fixed`, `--color-secondary` (vert), `--color-secondary-container`, `--color-on-secondary-container`, `--color-error` |
| Contours | `--color-border-distinct` (bordure 1,5 px à 15-20 % d'opacité), `--color-focus` (anneau de focus 3 px) |
| Polices | `--font-headline`, `--font-body` |
| Tailles | `--text-headline-xl` (34 px), `--text-headline-xl-mobile` (28 px), `--text-headline-md` (22 px), `--text-headline-sm` (19 px), `--text-body-lg` (18 px, texte courant), `--text-body-md` (16 px), `--text-label-lg` (17 px), `--text-label-sm` (14 px) |
| Espacements | `--spacing-margin` (marge de page mobile, 20 px), `--spacing-space-xs`, `--spacing-space-sm`, `--spacing-space-md`, `--spacing-space-lg`, `--spacing-space-xl` |
| Rayons | `--radius-md` (12 px, boutons), `--radius-lg` (16 px, cartes), `--radius-full` (pastilles, badges) |

Règles non négociables : cible tactile d'au moins 52 × 52 px (bouton principal : 56 px de haut), texte courant de 18 px minimum, une icône toujours accompagnée d'un texte, contraste AAA.

## Composants

- `TitrePage` (`titre`, `sousTitre`) : titre de rubrique en haut de page.
- `Bientot` (`icone`, `message?`) : encart d'état vide ou de rubrique à venir.
- `Icone` (`nom`, `plein?`, `className?`) : pictogramme Material Symbols décoratif. Taille : `className="size-7"` (28 px, seule classe de taille livrée), ou placer l'icône dans un élément de la taille voulue (24 × 24 px par exemple) : le SVG en prend toute la largeur. Couleur : celle du texte (`color`). `plein` pour l'onglet actif.

Fiches détaillées : `components/general/<Nom>/<Nom>.prompt.md`.

## Exemple

```jsx
const { TitrePage, Bientot } = window.CoMunity;

<main style={{ background: "var(--color-surface)", padding: "var(--spacing-margin)", fontFamily: "var(--font-body)" }}>
  <TitrePage titre="Mes activités" sousTitre="Vos participations et vos propositions" />
  <Bientot icone="event_available" message="Vous n'êtes inscrit à aucune activité pour le moment." />
  <button style={{
    minHeight: 56, width: "100%", marginTop: "var(--spacing-space-lg)",
    borderRadius: "var(--radius-md)", background: "var(--color-primary)", color: "var(--color-on-primary)",
    fontFamily: "var(--font-headline)", fontSize: "var(--text-body-lg)", fontWeight: 700, border: "none",
  }}>
    Voir les activités
  </button>
</main>
```
