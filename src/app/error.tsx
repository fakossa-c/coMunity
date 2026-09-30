"use client";

import { EcranErreur } from "@/components/ecran-erreur";

/** Une lecture en échec dans une page : l'écran d'erreur, sous la mise en page racine. */
export default function Erreur({ retry }: { retry: () => void }) {
  return <EcranErreur reessayer={retry} />;
}
