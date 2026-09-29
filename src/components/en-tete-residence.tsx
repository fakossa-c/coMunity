import type { ReactNode } from "react";
import { Logo } from "./logo";

type Props = {
  residence: string;
  /** BarreNavigation : sur ordinateur, ses onglets prennent place dans l'en-tête. */
  navigation?: ReactNode;
  /** Avatar de la personne connectée, ou « Se connecter ». */
  compte: ReactNode;
};

/** En-tête des écrans principaux : logo, nom de la résidence, compte. Il défile avec la page. */
export function EnTeteResidence({ residence, navigation, compte }: Props) {
  return (
    // Le nom n'est jamais tronqué ni coupé dans un mot : c'est le repère de l'écran. Quand il
    // manque de place, il revient à la ligne entre deux mots et le compte passe dessous.
    <header className="mx-auto flex w-full max-w-(--largeur-colonne) flex-wrap items-center gap-space-sm px-margin pt-[calc(env(safe-area-inset-top)+0.75rem)] pb-space-sm desktop:px-margin-desktop">
      <div className="flex flex-col items-start gap-1">
        <Logo />
        <p className="font-headline text-headline-sm break-words text-on-surface">
          {residence}
        </p>
      </div>
      {navigation}
      <div className="ml-auto">{compte}</div>
    </header>
  );
}
