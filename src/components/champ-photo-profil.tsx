"use client";

import { useId, useRef, useState } from "react";
import { compresserImage } from "@/lib/compression-image";
import { Avatar } from "./avatar";
import { Bouton } from "./bouton";

/**
 * La photo du profil dans le formulaire : déjà enregistrée (`chemin`) ou choisie à l'instant, déjà
 * compressée et prête à partir (`fichier`). `apercu` est l'adresse qui l'affiche, vide quand celle
 * d'une photo enregistrée n'a pas pu être signée.
 */
export type PhotoProfilSaisie = {
  apercu: string;
  chemin?: string;
  fichier?: Blob;
};

type Props = {
  photo: PhotoProfilSaisie | null;
  /** L'initiale du pseudo saisi, montrée à défaut de photo. */
  initiale: string;
  onChoisir: (photo: PhotoProfilSaisie) => void;
  onRetirer: () => void;
};

/**
 * Le choix de la photo du profil, facultatif : compressée dans le navigateur dès qu'elle est
 * choisie, envoyée à l'enregistrement du formulaire. Choisir une autre photo remplace la première ;
 * « Retirer la photo » la supprime et rend l'initiale du pseudo.
 */
export function ChampPhotoProfil({
  photo,
  initiale,
  onChoisir,
  onRetirer,
}: Props) {
  const id = useId();
  // Changer la clé vide le sélecteur : rechoisir la même photo après l'avoir retirée déclenche `onChange`.
  const [cleSelecteur, setCleSelecteur] = useState(0);
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState("");
  // Reçoit le focus quand « Retirer la photo » disparaît avec la photo : le lecteur d'écran lit le nouvel état.
  const etat = useRef<HTMLParagraphElement>(null);

  async function choisir(fichier: File | undefined) {
    if (!fichier) return;
    setErreur("");
    setEnCours(true);
    try {
      const compresse = await compresserImage(fichier);
      onChoisir({ apercu: URL.createObjectURL(compresse), fichier: compresse });
    } catch (e) {
      setErreur(
        e instanceof Error ? e.message : "Cette photo n'a pas pu être lue.",
      );
    }
    setCleSelecteur((cle) => cle + 1);
    setEnCours(false);
  }

  return (
    <fieldset className="flex flex-col gap-space-sm">
      <legend className="font-headline text-label-lg">Photo</legend>
      <p id={`${id}-aide`} className="text-body-md text-on-surface-variant">
        Facultative. Vous et le conseil syndical la voyez ; vos voisins voient
        l&apos;initiale de votre pseudo.
      </p>
      <div className="flex items-center gap-space-md">
        <Avatar
          initiale={initiale}
          variante="marine"
          taille={72}
          photo={photo?.apercu || undefined}
        />
        <p
          ref={etat}
          tabIndex={-1}
          role="status"
          className="font-headline text-body-bold outline-none"
        >
          {enCours
            ? "Préparation de la photo…"
            : photo
              ? "Une photo"
              : "Aucune photo pour l'instant."}
        </p>
      </div>
      <div className="flex flex-col gap-space-xs">
        <label htmlFor={id} className="font-headline text-label-lg">
          {photo ? "Remplacer la photo" : "Ajouter une photo"}
        </label>
        <input
          key={cleSelecteur}
          id={id}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          aria-describedby={`${id}-aide`}
          disabled={enCours}
          onChange={(e) => choisir(e.target.files?.[0])}
          className="min-h-champ w-full rounded-md border-[1.5px] border-outline bg-fond-carte px-4 py-2 font-body text-body-lg text-on-surface file:mr-3 file:min-h-cible file:cursor-pointer file:rounded-full file:border-0 file:bg-fond-action file:px-4 file:font-headline file:text-label-lg file:text-texte-action disabled:opacity-50"
        />
      </div>
      {photo && (
        <div>
          <Bouton
            variante="fantome"
            icone="close"
            iconeTaille={22}
            onClick={() => {
              onRetirer();
              etat.current?.focus();
            }}
            disabled={enCours}
          >
            Retirer la photo
          </Bouton>
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
