import type { Metadata, Viewport } from "next";
import {
  Atkinson_Hyperlegible_Next,
  Plus_Jakarta_Sans,
} from "next/font/google";
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
  adjustFontFallback: false,
});

export const metadata: Metadata = {
  title: {
    default: "Vie de la résidence",
    template: "%s · Vie de la résidence",
  },
  description: "Activités, annonces et voisins de la résidence.",
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
      <body className="flex min-h-screen flex-col bg-surface font-body text-body-md text-on-surface antialiased">
        <a
          href="#contenu"
          className="sr-only z-[60] rounded-xl bg-inverse-surface px-4 py-3 font-headline text-label-lg text-inverse-on-surface focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
        >
          Aller au contenu
        </a>
        <EnTete />
        <NavigationPrincipale />
        <main
          id="contenu"
          tabIndex={-1}
          className="mx-auto w-full max-w-[980px] flex-1 px-margin pt-24 pb-32 desktop:px-margin-desktop desktop:pt-44 desktop:pb-16"
        >
          {children}
        </main>
      </body>
    </html>
  );
}
