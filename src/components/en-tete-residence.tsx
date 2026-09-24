import type { ReactNode } from "react";
import { Logo } from "./logo";

type Props = {
  residence: string;
  /** Avatar de la personne connectée, ou « Se connecter ». */
  compte: ReactNode;
};

/** En-tête des écrans principaux : logo, nom de la résidence, compte. Il défile avec la page. */
export function EnTeteResidence({ residence, compte }: Props) {
  return (
    <header className="mx-auto flex w-full max-w-[980px] items-center justify-between gap-space-sm px-margin pt-[calc(env(safe-area-inset-top)+0.75rem)] pb-space-sm desktop:px-margin-desktop">
      <div className="flex min-w-0 flex-col items-start gap-1">
        <Logo />
        {/* Jamais tronqué : c'est le repère de l'écran, il revient à la ligne s'il le faut. */}
        <p className="max-w-full font-headline text-headline-sm break-words text-on-surface">
          {residence}
        </p>
      </div>
      {compte}
    </header>
  );
}
