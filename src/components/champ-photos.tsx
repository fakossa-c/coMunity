"use client";

import { useId, useRef, useState } from "react";
import { compresserImage } from "@/lib/compression-image";
import {
  MAX_PHOTOS,
  compteurPhoto,
  libellePhotos,
  texteAlternatif,
} from "@/lib/photos-activite";
import { Bouton } from "./bouton";
import { EmplacementPhoto } from "./emplacement-photo";

/**
 * Une photo de l'activité dans le parcours : déjà enregistrée (`chemin`) ou choisie à l'instant,
 * déjà compressée et prête à partir (`fichier`). `apercu` est l'adresse qui l'affiche.
 */
export type PhotoSaisie = {
  cle: string;
  apercu: string;
  chemin?: string;
  fichier?: Blob;
};

type Props = {
  photos: PhotoSaisie[];
  /** Le titre saisi, repris dans le texte alternatif des aperçus. */
  titre: string;
  onAjouter: (nouvelles: PhotoSaisie[]) => void;
  onRetirer: (index: number) => void;
  onMettreEnPremiere: (index: number) => void;
  /**
   * Sur ordinateur, le bloc « Photos » de la page unique porte déjà le titre : la légende reste
   * pour le lecteur d'écran seulement.
   */
  legendeMasqueeSurBureau?: boolean;
};

/**
 * Le choix des photos d'une activité : jusqu'à 5, compressées dans le navigateur dès qu'elles sont
 * choisies. La première illustre l'activité dans la liste et dans l'aperçu du lien ; « Mettre en
 * première » change ce choix.
 */
export function ChampPhotos({
  photos,
  titre,
  onAjouter,
  onRetirer,
  onMettreEnPremiere,
  legendeMasqueeSurBureau = false,
}: Props) {
  const id = useId();
  // Changer la clé vide le sélecteur : rechoisir la même photo après l'avoir retirée déclenche `onChange`.
  const [cleSelecteur, setCleSelecteur] = useState(0);
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState("");
  // Reçoit le focus quand la photo qui l'avait disparaît : le lecteur d'écran lit le nouveau compte.
  const resume = useRef<HTMLParagraphElement>(null);
  const restantes = MAX_PHOTOS - photos.length;
  const nomActivite = titre.trim() || "Votre activité";

  async function choisir(fichiers: File[]) {
    setErreur("");
    setEnCours(true);
    const nouvelles: PhotoSaisie[] = [];
    let echec = "";
    for (const fichier of fichiers.slice(0, restantes)) {
      try {
        const compresse = await compresserImage(fichier);
        nouvelles.push({
          cle: crypto.randomUUID(),
          apercu: URL.createObjectURL(compresse),
          fichier: compresse,
        });
      } catch (e) {
        echec =
          e instanceof Error ? e.message : "Cette photo n'a pas pu être lue.";
      }
    }
    if (fichiers.length > restantes)
      echec ||= `Vous pouvez ajouter ${restantes} ${restantes === 1 ? "photo" : "photos"} de plus : ${MAX_PHOTOS} au plus.`;
    if (nouvelles.length > 0) onAjouter(nouvelles);
    setErreur(echec);
    setCleSelecteur((cle) => cle + 1);
    setEnCours(false);
  }

  function apres(action: () => void) {
    action();
    resume.current?.focus();
  }

  return (
    <fieldset className="flex flex-col gap-space-sm">
      <legend
        className={`font-headline text-label-lg ${legendeMasqueeSurBureau ? "desktop:sr-only" : ""}`}
      >
        Photos
      </legend>
      <p id={`${id}-aide`} className="text-body-md text-on-surface-variant">
        Facultatif, {MAX_PHOTOS} photos au plus. La première illustre votre
        activité dans la liste et dans l&apos;aperçu du lien.
      </p>
      <p
        ref={resume}
        tabIndex={-1}
        aria-live="polite"
        className="font-headline text-body-bold outline-none"
      >
        {enCours
          ? "Préparation des photos…"
          : photos.length === 0
            ? "Aucune photo pour l'instant."
            : `${libellePhotos(photos.length)} sur ${MAX_PHOTOS}`}
      </p>
      {photos.length > 0 && (
        <ul
          className={`flex flex-col gap-bloc ${legendeMasqueeSurBureau ? "desktop:grid desktop:grid-cols-4 desktop:items-start desktop:gap-3" : ""}`}
        >
          {photos.map((photo, index) => (
            <li key={photo.cle} className="flex flex-col gap-space-sm">
              <EmplacementPhoto
                src={photo.apercu}
                alt={texteAlternatif(nomActivite, index + 1, photos.length)}
                compteur={
                  photos.length > 1
                    ? compteurPhoto(index + 1, photos.length)
                    : undefined
                }
                arrondi
                className={
                  legendeMasqueeSurBureau ? "desktop:h-[104px]!" : undefined
                }
              />
              <div className="flex flex-wrap gap-space-sm">
                {index > 0 && (
                  <Bouton
                    variante="contour"
                    icone="keep"
                    iconeTaille={22}
                    onClick={() => apres(() => onMettreEnPremiere(index))}
                    disabled={enCours}
                  >
                    Mettre en première
                    <span className="sr-only">
                      {" "}
                      : photo {compteurPhoto(index + 1, photos.length)}
                    </span>
                  </Bouton>
                )}
                <Bouton
                  variante="fantome"
                  icone="close"
                  iconeTaille={22}
                  onClick={() => apres(() => onRetirer(index))}
                  disabled={enCours}
                >
                  Retirer
                  <span className="sr-only">
                    {" "}
                    : photo {compteurPhoto(index + 1, photos.length)}
                  </span>
                </Bouton>
              </div>
            </li>
          ))}
        </ul>
      )}
      {restantes > 0 && (
        <div className="flex flex-col gap-space-xs">
          <label htmlFor={id} className="font-headline text-label-lg">
            {photos.length === 0
              ? "Ajouter des photos"
              : "Ajouter d'autres photos"}
          </label>
          <input
            key={cleSelecteur}
            id={id}
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp"
            aria-describedby={`${id}-aide`}
            disabled={enCours}
            onChange={(e) => choisir(Array.from(e.target.files ?? []))}
            className="min-h-champ w-full rounded-md border-[1.5px] border-outline bg-fond-carte px-4 py-2 font-body text-body-lg text-on-surface file:mr-3 file:min-h-cible file:cursor-pointer file:rounded-full file:border-0 file:bg-fond-action file:px-4 file:font-headline file:text-label-lg file:text-texte-action disabled:opacity-50"
          />
        </div>
      )}
      {erreur && (
        <p role="alert" className="font-headline text-label-lg text-error">
          {erreur}
        </p>
      )}
    </fieldset>
  );
}
