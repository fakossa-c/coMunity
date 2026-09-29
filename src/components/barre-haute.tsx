import Link from "next/link";
import type { ReactNode } from "react";
import { Logo } from "./logo";

type Props = {
  /** BarreNavigation `haut` : les onglets, au centre. Absente sur les écrans de connexion. */
  navigation?: ReactNode;
  /** LienProposer, puis l'avatar ou « Se connecter », à droite. */
  actions?: ReactNode;
};

/**
 * Barre du haut du cadre Journal, sur ordinateur seulement : légère, sans bordure, sur le
 * conteneur de 1280 px. Le logo à gauche, les onglets au centre, « Proposer » et le compte à
 * droite. Elle défile avec la page. Sur mobile, l'en-tête et la barre du bas restent en place.
 */
export function BarreHaute({ navigation, actions }: Props) {
  return (
    <header className="relative z-30 hidden desktop:block">
      <div className="mx-auto grid h-barre-nav w-full max-w-conteneur grid-cols-[1fr_auto_1fr] items-center px-marge-journal">
        <Link href="/" className="justify-self-start rounded-md">
          <Logo hauteur={32} />
        </Link>
        <div className="justify-self-center">{navigation}</div>
        <div className="flex items-center justify-end gap-3.5">{actions}</div>
      </div>
    </header>
  );
}
