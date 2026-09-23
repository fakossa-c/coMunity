import type { Metadata, Viewport } from "next";
import {
  Atkinson_Hyperlegible_Next,
  Plus_Jakarta_Sans,
} from "next/font/google";
import { EcouteInstallation } from "@/components/ecoute-installation";
import { EnTete } from "@/components/en-tete";
import { NavigationPrincipale } from "@/components/navigation-principale";
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
    default: "Vie de la résidence",
    template: "%s · Vie de la résidence",
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className={`${plusJakarta.variable} ${atkinson.variable}`}>
      <body className="flex min-h-screen flex-col bg-surface font-body text-body-lg text-on-surface antialiased">
        <a
          href="#contenu"
          className="sr-only z-[60] min-h-[52px] rounded-md bg-inverse-surface px-4 py-3 font-headline text-label-lg text-inverse-on-surface focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
        >
          Aller au contenu
        </a>
        <EnTete />
        <NavigationPrincipale />
        <main
          id="contenu"
          tabIndex={-1}
          className="mx-auto w-full max-w-[980px] flex-1 px-margin pt-[calc(6rem+env(safe-area-inset-top))] pb-[calc(8rem+env(safe-area-inset-bottom))] desktop:px-margin-desktop desktop:pt-44 desktop:pb-16"
        >
          {children}
        </main>
        <EcouteInstallation />
      </body>
    </html>
  );
}
