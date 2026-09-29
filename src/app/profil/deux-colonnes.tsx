import type { ReactNode } from "react";

/**
 * Deux blocs qui se font face sur ordinateur (présentation Journal) ; empilés sur mobile. Les blocs
 * gardent leur hauteur : ils ne s'étirent pas à celle du plus haut.
 */
export function DeuxColonnes({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col gap-bloc desktop:grid desktop:grid-cols-2 desktop:items-start desktop:gap-space-xl">
      {children}
    </div>
  );
}
