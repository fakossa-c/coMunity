"use client";

import { useState, useTransition } from "react";
import { Avatar } from "@/components/avatar";
import { BarreActionFixe } from "@/components/barre-action-fixe";
import { Bouton } from "@/components/bouton";
import { Champ, ChampListe } from "@/components/champ";
import { ChampFichier } from "@/components/champ-fichier";
import { FeuilleConfirmation } from "@/components/feuille-confirmation";
import { Annonce } from "@/components/formulaire";
import { compresserImage } from "@/lib/compression-image";
import {
  BUCKET_SYNDIC,
  LIMITES_FICHE,
  initialeFiche,
  verifierFiche,
  type ChampFiche,
  type CompteRelie,
  type SaisieFiche,
} from "@/lib/fiche-syndic";
import {
  erreurDuChamp,
  erreurGenerale,
  type ErreurFormulaire,
  type Resultat,
} from "@/lib/resultat";
import { clientNavigateur } from "@/lib/supabase/navigateur";
import { BlocFormulaire, CLASSES_FORMULAIRE } from "../colonne-formulaire";
import {
  enregistrerFiche,
  preparerDepotPhoto,
  supprimerFiche,
} from "./actions";

type Props = {
  comptes: CompteRelie[];
  /** Absent pour une nouvelle fiche. */
  fiche?: {
    id: string;
    saisie: SaisieFiche;
    photoChemin: string | null;
    photoUrl: string | null;
  };
};

/** La photo choisie à l'instant : lue par le navigateur, déjà compressée, prête à partir. */
type PhotoChoisie = { fichier: File; compresse: Blob; apercu: string };

const VIDE: SaisieFiche = {
  prenom: "",
  nom: "",
  telephone: "",
  email: "",
  compteId: "",
};

/**
 * Ajouter ou modifier une fiche de Mon syndic, photo comprise (compressée dans le navigateur dès
 * qu'elle est choisie) ; la supprimer, derrière une confirmation.
 */
export function FormulaireFiche({ comptes, fiche }: Props) {
  const [saisie, setSaisie] = useState<SaisieFiche>(fiche?.saisie ?? VIDE);
  const [photoChemin, setPhotoChemin] = useState(fiche?.photoChemin ?? null);
  const [choisie, setChoisie] = useState<PhotoChoisie | null>(null);
  const [erreurPhoto, setErreurPhoto] = useState<string>();
  const [erreur, setErreur] = useState<ErreurFormulaire<ChampFiche>>({});
  const [resultat, setResultat] = useState<Resultat | null>(null);
  const [suppression, setSuppression] = useState(false);
  const [enCours, demarrer] = useTransition();

  function poser(champ: keyof SaisieFiche, valeur: string) {
    setSaisie((s) => ({ ...s, [champ]: valeur }));
    // L'erreur d'un champ qu'on corrige n'a plus lieu d'être.
    if (erreur.champ === champ) setErreur({});
  }

  async function choisirPhoto(fichier: File) {
    setErreurPhoto(undefined);
    try {
      const compresse = await compresserImage(fichier);
      setChoisie({
        fichier,
        compresse,
        apercu: URL.createObjectURL(compresse),
      });
    } catch (e) {
      setErreurPhoto(
        e instanceof Error ? e.message : "Cette photo n'a pas pu être lue.",
      );
    }
  }

  function retirerPhoto() {
    setErreurPhoto(undefined);
    setChoisie(null);
    setPhotoChemin(null);
  }

  function enregistrer() {
    const verdict = verifierFiche(saisie);
    setErreur(verdict);
    setResultat(null);
    if (verdict.erreur) return;
    // Enregistrée, la fiche mène à la liste : seul un échec revient ici.
    demarrer(async () => {
      let chemin = photoChemin;
      if (choisie) {
        const depot = await preparerDepotPhoto();
        if (!depot.ok) return setResultat(depot);
        const { error } = await clientNavigateur()
          .storage.from(BUCKET_SYNDIC)
          .uploadToSignedUrl(depot.chemin, depot.token, choisie.compresse, {
            contentType: choisie.compresse.type,
          });
        if (error)
          return setResultat({
            ok: false,
            message:
              "La photo n'a pas pu être envoyée. Réessayez dans un instant.",
          });
        chemin = depot.chemin;
      }
      setResultat(await enregistrerFiche(fiche?.id ?? null, saisie, chemin));
    });
  }

  function supprimer() {
    if (!fiche) return;
    demarrer(async () => {
      const reponse = await supprimerFiche(
        fiche.id,
        `${saisie.prenom} ${saisie.nom}`.trim(),
      );
      setSuppression(false);
      setResultat(reponse);
    });
  }

  const apercu = choisie?.apercu ?? (photoChemin ? fiche?.photoUrl : null);
  const texte = (
    champ: ChampFiche,
    libelle: string,
    max: number,
    extra: Partial<React.ComponentProps<typeof Champ>> = {},
  ) => ({
    libelle,
    name: champ,
    autoComplete: "off",
    value: saisie[champ],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
      poser(champ, e.target.value),
    maxLength: max,
    erreur: erreurDuChamp(erreur, champ),
    ...extra,
  });

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        enregistrer();
      }}
      className={CLASSES_FORMULAIRE}
    >
      <Annonce
        message={
          erreurGenerale(erreur) ?? (resultat?.ok === false && resultat.message)
        }
        erreur
      />
      <BlocFormulaire>
        <Champ
          {...texte("prenom", "Prénom", LIMITES_FICHE.identite)}
          required
        />
        <Champ {...texte("nom", "Nom", LIMITES_FICHE.identite)} required />
        <Champ
          {...texte("telephone", "Téléphone", LIMITES_FICHE.telephone, {
            type: "tel",
            inputMode: "tel",
            aide: "Facultatif. Les résidents pourront l'appeler d'un geste.",
          })}
        />
        <Champ
          {...texte("email", "E-mail", LIMITES_FICHE.email, {
            type: "email",
            inputMode: "email",
            aide: "Facultatif. Les résidents pourront lui écrire d'un geste.",
          })}
        />
      </BlocFormulaire>

      <BlocFormulaire>
        <div className="flex flex-col gap-space-sm">
          <div className="flex items-center gap-space-md">
            <Avatar
              initiale={initialeFiche(saisie) || "?"}
              taille={72}
              photo={apercu ?? undefined}
            />
            <p className="text-body-md text-on-surface-variant">
              {apercu
                ? "Voici la photo que les résidents verront."
                : "Sans photo, les résidents voient l'initiale du prénom."}
            </p>
          </div>
          <ChampFichier
            libelle="Photo"
            aide="Facultatif. JPEG, PNG ou WebP : elle est réduite avant d'être envoyée."
            accept="image/jpeg,image/png,image/webp"
            fichier={choisie?.fichier ?? null}
            nomActuel={photoChemin && !choisie ? "Photo actuelle" : null}
            erreur={erreurPhoto}
            onChoisir={choisirPhoto}
            onRetirer={retirerPhoto}
          />
        </div>
      </BlocFormulaire>

      <BlocFormulaire>
        <ChampListe
          libelle="Compte dans l'espace syndic"
          name="compteId"
          value={saisie.compteId}
          onChange={(e) => poser("compteId", e.target.value)}
          aide="Si cette personne a un compte dans l'espace syndic, reliez-le : la fiche porte alors la mention « Sur coMunity »."
        >
          <option value="">Aucun compte</option>
          {comptes.map(({ id, libelle }) => (
            <option key={id} value={id}>
              {libelle}
            </option>
          ))}
        </ChampListe>
      </BlocFormulaire>

      {fiche && (
        <>
          <Bouton
            variante="danger"
            className="desktop:self-start"
            icone="delete"
            onClick={() => setSuppression(true)}
            disabled={enCours}
          >
            Supprimer la fiche
          </Bouton>
          <FeuilleConfirmation
            ouverte={suppression}
            titre="Supprimer cette fiche ?"
            libelleGarder="Garder la fiche"
            libelleConfirmer={enCours ? "Suppression…" : "Supprimer"}
            onFermer={() => setSuppression(false)}
            onConfirmer={supprimer}
            desactive={enCours}
          >
            La fiche disparaît de Mon syndic, photo comprise. Le compte relié,
            s&apos;il existe, n&apos;est pas touché. Cette action est
            définitive.
          </FeuilleConfirmation>
        </>
      )}

      <BarreActionFixe colonne>
        <Bouton
          type="submit"
          pleineLargeur
          disabled={enCours}
          className="flex-1 text-body-lg"
        >
          {enCours ? "Enregistrement…" : "Enregistrer"}
        </Bouton>
      </BarreActionFixe>
    </form>
  );
}
