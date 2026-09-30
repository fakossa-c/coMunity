"use client";

import { EcranErreur } from "@/components/ecran-erreur";
import { classesCorps, classesPolices } from "./polices";
import "./globals.css";

/**
 * Une erreur dans la mise en page racine elle-même : l'écran d'erreur, dans son propre document,
 * aux couleurs du thème clair (les réglages d'affichage se lisent avec la session).
 */
export default function ErreurGlobale({ retry }: { retry: () => void }) {
  return (
    <html lang="fr" className={classesPolices}>
      <body className={classesCorps}>
        <EcranErreur reessayer={retry} />
      </body>
    </html>
  );
}
