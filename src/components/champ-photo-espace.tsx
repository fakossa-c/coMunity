"use client";

import { useId, useRef, useState } from "react";
import { compresserImage } from "@/lib/compression-image";
import {
  MAX_PHOTOS_ESPACE,
  texteAlternatifEspace,
} from "@/lib/photo-espace-commun";
import { compteurPhoto, libellePhotos } from "@/lib/photos-activite";
import { Bouton } from "./bouton";
import { EmplacementPhoto } from "./emplacement-photo";

/**
 * Une photo d'un espace commun dans le formulaire : déjà enregistrée (`chemin`) ou choisie à
 * l'instant, déjà compressée et prête à partir (`fichier`). `apercu` est l'adresse qui l'affiche,
 * vide quand celle d'une photo enregistrée n'a pas pu être signée.
 */
export type PhotoEspaceSaisie = {
  cle: string;
  apercu: string;
  chemin?: string;
  fichier?: Blob;
};

type Props = {
  photos: PhotoEspaceSaisie[];
  /** Le nom saisi, repris dans le texte alternatif des aperçus. */
  nom: string;
  onAjouter: (nouvelles: PhotoEspaceSaisie[]) => void;
  onRetirer: (index: number) => void;
  /** Décale la photo d'un rang : -1 la monte, 1 la descend. */
  onDeplacer: (index: number, decalage: -1 | 1) => void;
};

/**
 * Le choix des photos d'un espace commun : jusqu'à 5, compressées dans le navigateur dès qu'elles
 * sont choisies, envoyées à l'enregistrement du formulaire. La première illustre l'espace dans
 * Ma copro ; « Monter » et « Descendre » changent l'ordre, « Retirer » supprime une photo.
 */
export function ChampPhotoEspace({
  photos,
  nom,
  onAjouter,
  onRetirer,
  onDeplacer,
}: Props) {
  const id = useId();
  // Changer la clé vide le sélecteur : rechoisir la même photo après l'avoir retirée déclenche `onChange`.
  const [cleSelecteur, setCleSelecteur] = useState(0);
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState("");
  // Dit un changement d'ordre ; vide dès qu'une photo s'ajoute ou se retire.
  const [deplacement, setDeplacement] = useState("");
  // Reçoit le focus quand la photo qui l'avait bouge ou disparaît : le lecteur d'écran lit le nouvel état.
  const resume = useRef<HTMLParagraphElement>(null);
  const restantes = MAX_PHOTOS_ESPACE - photos.length;
  const nomEspace = nom.trim() || "Cet espace commun";

  async function choisir(fichiers: File[]) {
    setErreur("");
    setEnCours(true);
    const nouvelles: PhotoEspaceSaisie[] = [];
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
      echec ||= `Vous pouvez ajouter ${restantes} ${restantes === 1 ? "photo" : "photos"} de plus : ${MAX_PHOTOS_ESPACE} au plus.`;
    if (nouvelles.length > 0) {
      setDeplacement("");
      onAjouter(nouvelles);
    }
    setErreur(echec);
    setCleSelecteur((cle) => cle + 1);
    setEnCours(false);
  }

  function retirer(index: number) {
    setDeplacement("");
    onRetirer(index);
    resume.current?.focus();
  }

  function deplacer(index: number, decalage: -1 | 1) {
    setDeplacement(
      `Photo déplacée : maintenant ${compteurPhoto(index + decalage + 1, photos.length)}.`,
    );
    onDeplacer(index, decalage);
    resume.current?.focus();
  }

  return (
    <fieldset className="flex flex-col gap-space-sm">
      <legend className="font-headline text-label-lg">Photos</legend>
      <p id={`${id}-aide`} className="text-body-md text-on-surface-variant">
        Facultatif, {MAX_PHOTOS_ESPACE} photos au plus. La première illustre
        l&apos;espace commun dans Ma copro ; les voisins voient toutes les
        photos sur sa fiche.
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
            : `${libellePhotos(photos.length)} sur ${MAX_PHOTOS_ESPACE}`}
        {deplacement && <span className="sr-only"> · {deplacement}</span>}
      </p>
      {photos.length > 0 && (
        <ul className="flex flex-col gap-bloc">
          {photos.map((photo, index) => {
            const rang = compteurPhoto(index + 1, photos.length);
            return (
              <li key={photo.cle} className="flex flex-col gap-space-sm">
                <EmplacementPhoto
                  src={photo.apercu || undefined}
                  alt={texteAlternatifEspace(
                    nomEspace,
                    index + 1,
                    photos.length,
                  )}
                  compteur={photos.length > 1 ? rang : undefined}
                  arrondi
                />
                <div className="flex flex-wrap gap-space-sm">
                  {index > 0 && (
                    <Bouton
                      variante="contour"
                      icone="expand_less"
                      iconeTaille={22}
                      onClick={() => deplacer(index, -1)}
                      disabled={enCours}
                    >
                      Monter
                      <span className="sr-only"> : photo {rang}</span>
                    </Bouton>
                  )}
                  {index < photos.length - 1 && (
                    <Bouton
                      variante="contour"
                      icone="expand_more"
                      iconeTaille={22}
                      onClick={() => deplacer(index, 1)}
                      disabled={enCours}
                    >
                      Descendre
                      <span className="sr-only"> : photo {rang}</span>
                    </Bouton>
                  )}
                  <Bouton
                    variante="fantome"
                    icone="close"
                    iconeTaille={22}
                    onClick={() => retirer(index)}
                    disabled={enCours}
                  >
                    Retirer
                    <span className="sr-only"> : photo {rang}</span>
                  </Bouton>
                </div>
              </li>
            );
          })}
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
