import Image from "next/image";
import logoCouleur from "@/assets/logo-couleur.png";
import logoInverse from "@/assets/logo-inverse.png";

type Props = {
  /** couleur : sur fond clair, remplacé par l'inverse en thème sombre · inverse : sur terre cuite ou marine */
  variante?: "couleur" | "inverse";
  /** En px : 24 dans l'en-tête, 16 minimum. */
  hauteur?: number;
};

/** Logo officiel coMunity : fichiers du design system, jamais redessiné ni recoloré. */
export function Logo({ variante = "couleur", hauteur = 24 }: Props) {
  const largeur = Math.round(
    (hauteur * logoCouleur.width) / logoCouleur.height,
  );
  const dimensions = {
    width: largeur,
    height: hauteur,
    style: { width: largeur, height: hauteur },
  };

  if (variante === "inverse") {
    return <Image src={logoInverse} alt="coMunity" {...dimensions} />;
  }
  return (
    <>
      <Image
        src={logoCouleur}
        alt="coMunity"
        className="sombre:hidden"
        {...dimensions}
      />
      <Image
        src={logoInverse}
        alt="coMunity"
        className="hidden sombre:block"
        {...dimensions}
      />
    </>
  );
}
