import type { ReactNode } from "react";

type Props = { titre?: string; children: ReactNode };

/** Encart pêche pastel, sans bordure : un mot d'accueil ou ce qu'il faut savoir. */
export function EncartPastel({ titre = "À savoir", children }: Props) {
  return (
    <div className="flex flex-col gap-space-xs rounded-lg bg-fond-action p-4 text-texte-action">
      <strong className="font-headline text-headline-sm">{titre}</strong>
      <div className="max-w-[65ch] text-body-lg">{children}</div>
    </div>
  );
}
