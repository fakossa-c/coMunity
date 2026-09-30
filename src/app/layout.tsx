import type { Metadata, Viewport } from "next";
import { EcouteInstallation } from "@/components/ecoute-installation";
import { attributsAffichage } from "@/lib/attributs-affichage";
import { lireSession } from "@/lib/session";
import { classesCorps, classesPolices } from "./polices";
import "./globals.css";

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
    <html lang="fr" className={classesPolices} {...attributsAffichage(session)}>
      <body className={classesCorps}>
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
