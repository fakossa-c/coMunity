import type { MetadataRoute } from "next";
import { lireResidence } from "@/lib/residence";
import { nomCourt } from "@/lib/nom-court";

// Couleur Warm Commons `surface` : fond de l'écran de lancement et de la barre d'état.
const SURFACE = "#f8f9ff";

/** Manifeste de l'app installable, lu à chaque requête pour porter le nom de la résidence. */
export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const nom = (await lireResidence())?.nom ?? "Notre résidence";

  return {
    id: "/",
    name: nom,
    short_name: nomCourt(nom),
    description: "Activités, annonces et voisins de la résidence.",
    lang: "fr",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: SURFACE,
    theme_color: SURFACE,
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      {
        src: "/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
