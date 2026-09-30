"use client";

import { useState, type KeyboardEvent } from "react";
import { texteAlternatifEspace } from "@/lib/photo-espace-commun";
import { compteurPhoto, texteAlternatif } from "@/lib/photos-activite";
import { BoutonRond } from "./bouton-rond";
import { EmplacementPhoto } from "./emplacement-photo";

type Props = {
  /** Les adresses des photos, dans l'ordre : la première s'affiche d'abord. */
  photos: string[];
  /** Le titre de l'activité ou le nom de l'espace commun, repris dans le texte alternatif de chaque photo. */
  titre: string;
  /** Ce que les photos illustrent : l'activité (par défaut) ou un espace commun. */
  sujet?: "activite" | "espace";
  /**
   * Sur ordinateur, une colonne de vignettes à droite de la photo, pour aller droit à l'une
   * d'elles. Sur mobile, rien : la photo seule et ses deux boutons.
   */
  vignettes?: boolean;
  /** Classes ajoutées à la photo, pour la hauteur en tête de fiche. */
  className?: string;
};

const LIBELLE_GALERIE = {
  activite: "Photos de l'activité",
  espace: "Photos de l'espace commun",
} as const;

/**
 * Les photos de la fiche, une à la fois, avec le compteur « 1 sur 4 » et deux boutons pour passer
 * de l'une à l'autre (les flèches du clavier aussi, depuis un des boutons). Une seule photo :
 * ni compteur ni boutons ni vignettes.
 */
export function GaleriePhotos({
  photos,
  titre,
  sujet = "activite",
  vignettes = false,
  className,
}: Props) {
  const [rang, setRang] = useState(0);
  // Dit le changement de photo à un lecteur d'écran ; vide tant que personne n'a navigué.
  const [annonce, setAnnonce] = useState("");
  const total = photos.length;
  if (total === 0) return null;
  const seule = total === 1;
  const avecVignettes = vignettes && !seule;
  const alt = (position: number) =>
    sujet === "espace"
      ? texteAlternatifEspace(titre, position, total)
      : texteAlternatif(titre, position, total);

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
      aria-label={LIBELLE_GALERIE[sujet]}
      onKeyDown={surTouche}
      className={
        avecVignettes
          ? "relative grid gap-4 desktop:grid-cols-[minmax(0,1fr)_200px]"
          : "relative"
      }
    >
      <div className="relative min-w-0">
        <EmplacementPhoto
          // Un `key` par photo : la nouvelle repart de l'emplacement rayé au lieu de garder l'ancienne à l'écran.
          key={photos[rang]}
          src={photos[rang]}
          alt={alt(rang + 1)}
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
      </div>
      {avecVignettes && (
        <ul
          aria-label="Vignettes"
          className="hidden min-h-0 desktop:flex desktop:flex-col desktop:gap-[9px]"
        >
          {photos.map((photo, i) => (
            <li key={photo} className="min-h-11 flex-1">
              <button
                type="button"
                aria-label={`Photo ${compteurPhoto(i + 1, total)}`}
                aria-current={i === rang ? "true" : undefined}
                onClick={() => aller(i)}
                className={`relative block size-full cursor-pointer overflow-hidden rounded-md bg-rayures-photo transition-[opacity,box-shadow] duration-(--duree-courte) ease-(--ease-journal) ${
                  i === rang
                    ? "opacity-100 ring-[3px] ring-primary-fixed-dim"
                    : "opacity-60 hover:opacity-100"
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- vignette d'une photo déjà chargée, signée par le serveur */}
                <img
                  src={photo}
                  alt=""
                  loading="lazy"
                  className="absolute inset-0 size-full object-cover"
                />
              </button>
            </li>
          ))}
        </ul>
      )}
      <p aria-live="polite" className="sr-only">
        {annonce}
      </p>
    </section>
  );
}
