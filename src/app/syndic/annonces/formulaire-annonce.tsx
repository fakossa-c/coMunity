"use client";

import { useState, useTransition } from "react";
import { BarreActionFixe } from "@/components/barre-action-fixe";
import { Bouton } from "@/components/bouton";
import { Champ, ChampListe, ChampTexte } from "@/components/champ";
import { ChampFichier } from "@/components/champ-fichier";
import { ChoixPastilles } from "@/components/choix-pastilles";
import { Annonce as Message } from "@/components/formulaire";
import {
  BUCKET_ANNONCES,
  LIMITES_ANNONCE,
  SAISIE_ANNONCE_VIDE,
  typesAnnonce,
  typesAnnonceListe,
  verifierAnnonce,
  verifierFichier,
  type ChampAnnonce,
  type GenreFichier,
  type SaisieAnnonce,
} from "@/lib/annonces";
import {
  SAISIE_SONDAGE_VIDE,
  verifierSondage,
  type ChampSondage,
  type SaisieSondage,
  type Sondage,
} from "@/lib/sondages";
import {
  erreurDuChamp,
  erreurGenerale,
  type ErreurFormulaire,
  type Resultat,
} from "@/lib/resultat";
import { deposerFichier } from "@/lib/envoi-photos";
import { BlocFormulaire, CLASSES_FORMULAIRE } from "../colonne-formulaire";
import { enregistrerAnnonce, preparerDepot } from "./actions";
import { FormulaireSondage, SondagePublie } from "./formulaire-sondage";

type Props = {
  /** Absent pour une nouvelle annonce ; `id` absent aussi pour une copie, qui préremplit la saisie. */
  annonce?: {
    id?: string;
    saisie: SaisieAnnonce;
    /** Une copie préremplit le sondage de l'original, sans sa date limite. */
    sondage?: SaisieSondage;
    /** Le sondage déjà publié de l'annonce à modifier : il ne se modifie plus. */
    sondagePublie?: Sondage;
  };
};

const OPTIONS_EPINGLE = [
  {
    cle: "epinglee" as const,
    libelle: "Épingler en tête de la liste",
    icone: "keep" as const,
  },
];

const CHAMP_CHEMIN = {
  photo: "photo_chemin",
  document: "document_chemin",
} as const;

/** « convocation.pdf », le nom d'un fichier à partir de son chemin dans le bucket. */
function nomDuFichier(chemin: string | null) {
  return chemin?.split("/").pop() ?? null;
}

/** Publier une annonce, ou enregistrer sa modification. Les fichiers joints partent avec l'envoi. */
export function FormulaireAnnonce({ annonce }: Props) {
  const [saisie, setSaisie] = useState<SaisieAnnonce>(
    annonce?.saisie ?? SAISIE_ANNONCE_VIDE,
  );
  const [fichiers, setFichiers] = useState<Record<GenreFichier, File | null>>({
    photo: null,
    document: null,
  });
  const [erreurFichier, setErreurFichier] = useState<
    Partial<Record<GenreFichier, string>>
  >({});
  const [sondage, setSondage] = useState<SaisieSondage>(
    annonce?.sondage ?? SAISIE_SONDAGE_VIDE,
  );
  const [erreurSondage, setErreurSondage] = useState<
    ErreurFormulaire<ChampSondage>
  >({});
  const [erreur, setErreur] = useState<ErreurFormulaire<ChampAnnonce>>({});
  const [resultat, setResultat] = useState<Resultat | null>(null);
  const [enCours, demarrer] = useTransition();
  const id = annonce?.id ?? null;
  const sondagePublie = annonce?.sondagePublie;
  // Une annonce de type sondage sans sondage publié en porte un dans ce formulaire.
  const saisieSondage = saisie.type === "sondage" && !sondagePublie;
  // La modification d'une annonce expirée garde son expiration : seule une nouvelle date doit être à venir.
  const expirationEnregistree = id ? annonce?.saisie.expire_le || null : null;

  function poser<C extends keyof SaisieAnnonce>(
    champ: C,
    valeur: SaisieAnnonce[C],
  ) {
    setSaisie((s) => ({ ...s, [champ]: valeur }));
  }

  function choisir(genre: GenreFichier, fichier: File) {
    const refus = verifierFichier(fichier, genre);
    setErreurFichier((e) => ({ ...e, [genre]: refus ?? undefined }));
    if (refus) return;
    setFichiers((f) => ({ ...f, [genre]: fichier }));
  }

  function retirer(genre: GenreFichier) {
    setErreurFichier((e) => ({ ...e, [genre]: undefined }));
    setFichiers((f) => ({ ...f, [genre]: null }));
    poser(CHAMP_CHEMIN[genre], null);
  }

  /** Envoie les fichiers choisis, puis enregistre l'annonce avec leurs chemins. */
  function enregistrer() {
    const verdict = verifierAnnonce(saisie, undefined, expirationEnregistree);
    const verdictSondage = saisieSondage ? verifierSondage(sondage) : {};
    setErreur(verdict);
    setErreurSondage(verdict.erreur ? {} : verdictSondage);
    setResultat(null);
    if (verdict.erreur || verdictSondage.erreur) return;

    // Enregistrée, l'annonce mène à la liste : seul un échec revient ici.
    demarrer(async () => {
      let aEnregistrer = saisie;
      for (const genre of ["photo", "document"] as const) {
        const fichier = fichiers[genre];
        if (!fichier) continue;
        const depot = await preparerDepot(genre, {
          nom: fichier.name,
          type: fichier.type,
          taille: fichier.size,
        });
        if (!depot.ok) return setResultat(depot);
        const deposee = await deposerFichier(BUCKET_ANNONCES, depot, fichier);
        if (!deposee)
          return setResultat({
            ok: false,
            message: `Le fichier « ${fichier.name} » n'a pas pu être envoyé. Réessayez dans un instant.`,
          });
        // Un fichier déposé n'est pas renvoyé à l'essai suivant : il garde son chemin.
        aEnregistrer = { ...aEnregistrer, [CHAMP_CHEMIN[genre]]: depot.chemin };
        setSaisie(aEnregistrer);
        setFichiers((f) => ({ ...f, [genre]: null }));
      }
      setResultat(
        await enregistrerAnnonce(
          id,
          aEnregistrer,
          saisieSondage ? sondage : null,
        ),
      );
    });
  }

  const erreurDe = (champ: ChampAnnonce) => erreurDuChamp(erreur, champ);
  const texte = (champ: keyof typeof LIMITES_ANNONCE, libelle: string) => ({
    libelle,
    name: champ,
    autoComplete: "off",
    value: saisie[champ],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      poser(champ, e.target.value),
    maxLength: LIMITES_ANNONCE[champ],
    erreur: erreurDe(champ),
    compteur: {
      longueur: saisie[champ].length,
      max: LIMITES_ANNONCE[champ],
    },
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
      <Message
        message={
          erreurGenerale(erreur) ?? (resultat?.ok === false && resultat.message)
        }
        erreur
      />
      <BlocFormulaire>
        <ChampListe
          libelle="Type"
          name="type"
          value={saisie.type}
          onChange={(e) =>
            poser("type", e.target.value as SaisieAnnonce["type"])
          }
          disabled={Boolean(sondagePublie)}
          aide={
            sondagePublie
              ? "Le type d'une annonce qui porte un sondage ne change pas."
              : "Le type fixe la pastille, la couleur et le pictogramme de l'annonce."
          }
        >
          {typesAnnonceListe.map((cle) => (
            <option key={cle} value={cle}>
              {typesAnnonce[cle].libelle}
            </option>
          ))}
        </ChampListe>
        <Champ {...texte("titre", "Titre")} required />
      </BlocFormulaire>
      {saisieSondage && (
        <BlocFormulaire>
          <FormulaireSondage
            saisie={sondage}
            onChange={setSondage}
            erreur={erreurSondage}
          />
        </BlocFormulaire>
      )}
      {sondagePublie && (
        <BlocFormulaire>
          <SondagePublie sondage={sondagePublie} />
        </BlocFormulaire>
      )}
      <BlocFormulaire>
        <ChampTexte {...texte("texte", "Texte")} rows={5} />
        <Champ
          {...texte("quand", "Date ou période")}
          placeholder="Jeudi 12 novembre à 18h30"
        />
        <Champ {...texte("lieu", "Lieu")} placeholder="Salle commune" />
      </BlocFormulaire>
      <BlocFormulaire>
        <ChoixPastilles
          titre="Mise en avant"
          options={OPTIONS_EPINGLE}
          valeurs={saisie.epinglee ? ["epinglee"] : []}
          onChange={(valeurs) =>
            poser("epinglee", valeurs.includes("epinglee"))
          }
        />
        <Champ
          libelle="Expire le"
          name="expire_le"
          type="date"
          autoComplete="off"
          value={saisie.expire_le}
          onChange={(e) => poser("expire_le", e.target.value)}
          erreur={erreurDe("expire_le")}
          aide="Facultatif. Passé ce jour, l'annonce quitte la liste, mais son lien s'ouvre toujours."
        />
      </BlocFormulaire>
      <BlocFormulaire>
        <ChampFichier
          libelle="Photo"
          accept="image/jpeg,image/png,image/webp"
          aide="Facultatif. Elle illustre la page de l'annonce et son aperçu dans WhatsApp. JPEG, PNG ou WebP, 5 Mo au plus."
          fichier={fichiers.photo}
          nomActuel={nomDuFichier(saisie.photo_chemin)}
          erreur={erreurFichier.photo}
          onChoisir={(f) => choisir("photo", f)}
          onRetirer={() => retirer("photo")}
        />
        <ChampFichier
          libelle="Document PDF"
          accept="application/pdf"
          aide="Facultatif : la convocation, le plan des travaux. 5 Mo au plus, sans donnée personnelle."
          fichier={fichiers.document}
          nomActuel={nomDuFichier(saisie.document_chemin)}
          erreur={erreurFichier.document}
          onChoisir={(f) => choisir("document", f)}
          onRetirer={() => retirer("document")}
        />
      </BlocFormulaire>

      <BarreActionFixe colonne>
        <Bouton
          type="submit"
          pleineLargeur
          disabled={enCours}
          className="flex-1 text-body-lg"
        >
          {enCours ? "Envoi…" : id ? "Enregistrer" : "Publier"}
        </Bouton>
      </BarreActionFixe>
    </form>
  );
}
