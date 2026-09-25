import type { Metadata, Viewport } from "next";
import {
  Atkinson_Hyperlegible_Next,
  Plus_Jakarta_Sans,
} from "next/font/google";
import { EcouteInstallation } from "@/components/ecoute-installation";
import { attributsAffichage } from "@/lib/attributs-affichage";
import { lireSession } from "@/lib/session";
import "./globals.css";

const plusJakarta = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta",
  subsets: ["latin"],
  weight: ["600", "700", "800"],
});

const atkinson = Atkinson_Hyperlegible_Next({
  variable: "--font-atkinson",
  subsets: ["latin"],
  weight: ["400", "700"],
  // next/font ne connaît pas les métriques de cette police : sans cette option, avertissement au build.
  adjustFontFallback: false,
});

export const metadata: Metadata = {
  title: {
    default: "coMunity",
    template: "%s · coMunity",
  },
  description: "Activités, annonces et voisins de la résidence.",
  // iPhone : ouverture en plein écran depuis l'écran d'accueil. Le nom sous l'icône vient du
  // `short_name` du manifeste : le lire ici rendrait les métadonnées de chaque page dynamiques.
  appleWebApp: { capable: true, statusBarStyle: "default" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#f8f9ff",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await lireSession();

  return (
    <html
      lang="fr"
      className={`${plusJakarta.variable} ${atkinson.variable}`}
      {...attributsAffichage(session)}
    >
      <body className="flex min-h-screen flex-col bg-surface font-body text-body-lg text-on-surface antialiased">
        <a
          href="#contenu"
          className="sr-only z-[60] min-h-cible rounded-md bg-inverse-surface px-4 py-3 font-headline text-label-lg text-inverse-on-surface focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
        >
          Aller au contenu
        </a>
        {/* Chaque page pose son cadre (EcranPrincipal, EcranSecondaire), qui porte le contenu principal. */}
        {children}
        <EcouteInstallation />
      </body>
    </html>
  );
}
