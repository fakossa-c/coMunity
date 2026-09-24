import { Icone } from "comunity-ds";

const pictogrammes = [
  ["diversity_3", "Accueil"],
  ["event_available", "Mes activités"],
  ["add_circle", "Proposer"],
  ["group", "Voisins"],
  ["apartment", "Résidence"],
  ["mail", "Annonces"],
] as const;

export const Pictogrammes = () => (
  <div className="grid grid-cols-3 gap-space-md text-on-surface-variant">
    {pictogrammes.map(([nom, libelle]) => (
      <div key={nom} className="flex flex-col items-center gap-1">
        <Icone nom={nom} className="size-7" />
        <span className="font-headline text-label-sm">{libelle}</span>
      </div>
    ))}
  </div>
);

export const ContourEtPlein = () => (
  <div className="flex items-center gap-space-lg text-primary">
    <div className="flex flex-col items-center gap-1">
      <Icone nom="event_available" className="size-7" />
      <span className="font-headline text-label-sm">Contour</span>
    </div>
    <div className="flex flex-col items-center gap-1">
      <Icone nom="event_available" plein className="size-7" />
      <span className="font-headline text-label-sm">Plein (onglet actif)</span>
    </div>
  </div>
);

export const EnPastille = () => (
  <div className="flex items-center gap-space-sm">
    <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary-fixed text-on-primary-fixed">
      <Icone nom="apartment" className="size-7" />
    </span>
    <span className="font-headline text-headline-sm text-primary">
      Résidence Les Tilleuls
    </span>
  </div>
);

export const DansUnConteneur = () => (
  <div
    style={{
      display: "flex",
      alignItems: "center",
      gap: "var(--spacing-space-sm)",
      color: "var(--color-secondary)",
    }}
  >
    <span style={{ display: "inline-flex", width: 24, height: 24 }}>
      <Icone nom="group" />
    </span>
    <span
      style={{
        fontFamily: "var(--font-body)",
        fontSize: "var(--text-body-lg)",
      }}
    >
      8 inscrits sur 12 places
    </span>
  </div>
);
