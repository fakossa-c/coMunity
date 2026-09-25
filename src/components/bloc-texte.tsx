import type { ReactNode } from "react";

/** Section de texte libre d'une fiche, sans fond. */
export function BlocTexte({
  titre,
  children,
}: {
  titre: string;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-space-xs">
      <h2 className="font-headline text-headline-sm text-on-surface">
        {titre}
      </h2>
      <div className="max-w-[65ch] text-body-lg whitespace-pre-line text-on-surface">
        {children}
      </div>
    </section>
  );
}
