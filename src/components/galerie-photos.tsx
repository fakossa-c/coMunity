"use client";

import { useState, type KeyboardEvent } from "react";
import { compteurPhoto, texteAlternatif } from "@/lib/photos-activite";
import { BoutonRond } from "./bouton-rond";
import { EmplacementPhoto } from "./emplacement-photo";

type Props = {
  /** Les adresses des photos, dans l'ordre : la première s'affiche d'abord. */
  photos: string[];
  /** Le titre de l'activité, repris dans le texte alternatif de chaque photo. */
  titre: string;
  /** Classes ajoutées à la photo, pour la hauteur en tête de fiche. */
  className?: string;
};

/**
 * Les photos de la fiche, une à la fois, avec le compteur « 1 sur 4 » et deux boutons pour passer
 * de l'une à l'autre (les flèches du clavier aussi, depuis un des boutons). Une seule photo :
 * ni compteur ni boutons.
 */
export function GaleriePhotos({ photos, titre, className }: Props) {
  const [rang, setRang] = useState(0);
  // Dit le changement de photo à un lecteur d'écran ; vide tant que personne n'a navigué.
  const [annonce, setAnnonce] = useState("");
  const total = photos.length;
  if (total === 0) return null;
  const seule = total === 1;

  function aller(cible: number) {
    const suivant = (cible + total) % total;
    setRang(suivant);
    setAnnonce(`Photo ${compteurPhoto(suivant + 1, total)}`);
  }

  function surTouche(e: KeyboardEvent) {
    if (seule) return;
    if (e.key === "ArrowLeft") aller(rang - 1);
    else if (e.key === "ArrowRight") aller(rang + 1);
  }

  return (
    <section
      aria-roledescription="carrousel"
      aria-label="Photos de l'activité"
      onKeyDown={surTouche}
      className="relative"
    >
      <EmplacementPhoto
        // Un `key` par photo : la nouvelle repart de l'emplacement rayé au lieu de garder l'ancienne à l'écran.
        key={photos[rang]}
        src={photos[rang]}
        alt={texteAlternatif(titre, rang + 1, total)}
        compteur={seule ? undefined : compteurPhoto(rang + 1, total)}
        arrondi
        immediate
        className={className}
      />
      {!seule && (
        <>
          <BoutonRond
            variante="marine"
            label="Photo précédente"
            icone="chevron_right"
            onClick={() => aller(rang - 1)}
            className="absolute top-1/2 left-3 -translate-y-1/2 rotate-180"
          />
          <BoutonRond
            variante="marine"
            label="Photo suivante"
            icone="chevron_right"
            onClick={() => aller(rang + 1)}
            className="absolute top-1/2 right-3 -translate-y-1/2"
          />
        </>
      )}
      <p aria-live="polite" className="sr-only">
        {annonce}
      </p>
    </section>
  );
}
