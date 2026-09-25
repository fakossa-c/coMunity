import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { icones, type NomIcone } from "@/components/icones";
import { categoriesActivite } from "@/lib/categories-activite";
import { lireFiche } from "@/lib/fiche-activite";
import { creneau, jourLong } from "@/lib/partage-activite";

// Aperçu du lien dans WhatsApp : le pictogramme de l'activité tient lieu de photo.
export const alt = "Aperçu de l'activité";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Couleurs du thème clair (src/app/globals.css) : l'image ne lit pas les variables CSS.
const COULEURS = {
  fond: "#f8f9ff",
  peche: "#ffdbd0",
  encrePeche: "#390c00",
  texte: "#121c2a",
  texteSecondaire: "#594139",
  terreCuite: "#8f2b00",
};

// Le fichier est lu une fois, au chargement du module.
const logo = readFile(join(process.cwd(), "src/assets/logo-couleur.png"));
const LOGO = { largeur: 1200, hauteur: 271 };

export default async function Image({
  params,
}: {
  params: Promise<{ identifiant: string }>;
}) {
  const { identifiant } = await params;
  const fiche = await lireFiche(identifiant);
  if (!fiche) return new Response(null, { status: 404 });

  const trace = icones[fiche.pictogramme as NomIcone] ?? icones.celebration;
  const logoBase64 = `data:image/png;base64,${(await logo).toString("base64")}`;
  const hauteurLogo = 56;

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        gap: 64,
        padding: 72,
        background: COULEURS.fond,
      }}
    >
      <div
        style={{
          width: 360,
          height: 360,
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 9999,
          background: COULEURS.peche,
        }}
      >
        <svg
          viewBox="0 -960 960 960"
          width={220}
          height={220}
          fill={COULEURS.encrePeche}
        >
          <path d={trace.contour} />
        </svg>
      </div>
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          gap: 20,
        }}
      >
        <div
          style={{
            fontSize: 32,
            fontWeight: 700,
            color: COULEURS.texteSecondaire,
          }}
        >
          {categoriesActivite[fiche.categorie].libelle}
        </div>
        <div
          style={{
            fontSize: 68,
            fontWeight: 800,
            lineHeight: 1.1,
            color: COULEURS.texte,
          }}
        >
          {fiche.titre}
        </div>
        <div
          style={{
            fontSize: 36,
            fontWeight: 700,
            color: COULEURS.terreCuite,
          }}
        >
          {jourLong(fiche.date_activite)}
        </div>
        <div
          style={{
            marginTop: -12,
            fontSize: 36,
            fontWeight: 700,
            color: COULEURS.terreCuite,
          }}
        >
          {creneau(fiche.heure_debut, fiche.heure_fin)}
        </div>
        <div style={{ fontSize: 36, color: COULEURS.texte }}>{fiche.lieu}</div>
        {/* eslint-disable-next-line @next/next/no-img-element -- rendu par ImageResponse, pas par le navigateur */}
        <img
          src={logoBase64}
          alt="coMunity"
          height={hauteurLogo}
          width={Math.round((hauteurLogo * LOGO.largeur) / LOGO.hauteur)}
          style={{ marginTop: 24 }}
        />
      </div>
    </div>,
    size,
  );
}
