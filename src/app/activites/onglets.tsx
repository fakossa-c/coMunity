/**
 * Onglets « J'y vais / J'organise » et puces « À venir / Passées » de l'onglet Activités.
 * Ce ticket (#8) ne remplit que « J'y vais · À venir » : les autres combinaisons affichent un
 * message d'attente. #12 (J'organise) et #15 (Passées) les rempliront à leur tour.
 */
export function Onglets({
  onglet,
  puce,
}: {
  onglet: "j_y_vais" | "j_organise";
  puce: "a_venir" | "passees";
}) {
  return (
    <div className="flex flex-col gap-space-sm">
      <div role="tablist" aria-label="Mes activités" className="flex gap-2">
        <Onglet actif={onglet === "j_y_vais"} href="/activites?onglet=j_y_vais">
          J&apos;y vais
        </Onglet>
        <Onglet
          actif={onglet === "j_organise"}
          href="/activites?onglet=j_organise"
        >
          J&apos;organise
        </Onglet>
      </div>
      <div className="flex gap-2">
        <Puce actif={puce === "a_venir"} href={`/activites?onglet=${onglet}&puce=a_venir`}>
          À venir
        </Puce>
        <Puce
          actif={puce === "passees"}
          href={`/activites?onglet=${onglet}&puce=passees`}
        >
          Passées
        </Puce>
      </div>
    </div>
  );
}

function Onglet({
  actif,
  href,
  children,
}: {
  actif: boolean;
  href: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      role="tab"
      aria-selected={actif}
      className={`rounded-full px-4 py-2 font-headline text-label-lg transition-colors ${
        actif
          ? "bg-fond-action text-texte-action"
          : "bg-surface-container-low text-on-surface-variant"
      }`}
    >
      {children}
    </a>
  );
}

function Puce({
  actif,
  href,
  children,
}: {
  actif: boolean;
  href: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      aria-current={actif ? "true" : undefined}
      className={`rounded-full border-2 px-3.5 py-1 text-body-md ${
        actif
          ? "border-contour-action text-on-surface"
          : "border-transparent text-on-surface-variant"
      }`}
    >
      {children}
    </a>
  );
}
