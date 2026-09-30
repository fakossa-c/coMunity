import Link from "next/link";
import { Annonce } from "@/components/formulaire";
import { ApercuActivite } from "@/components/apercu-activite";
import { Bouton, classesBouton } from "@/components/bouton";
import { Icone } from "@/components/icone";
import {
  pictogrammeDeLaSaisie,
  resumeCreneau,
  resumePlaces,
  type PointARemplir,
  type SaisieActivite,
} from "@/lib/proposition-activite";

type Props = {
  saisie: SaisieActivite;
  /** Le nom de l'espace commun choisi, sinon le lieu libre est lu dans la saisie. */
  lieu: string;
  /** L'adresse de la première photo choisie. */
  photo?: string | null;
  points: PointARemplir[];
  enCours: boolean;
  /** Le message d'échec de la publication, sous le bouton où l'on vient de cliquer. */
  message: string | false | undefined;
  /** L'adresse de la fiche d'une activité publiée dont des photos n'ont pas pu partir : « Publier » cède la place à « Voir l'activité ». */
  voirActivite?: string;
  onPublier: () => void;
};

/** « Il manque un titre, une date et un lieu. » : ce que la publication attend encore. */
function noteDePublication(points: PointARemplir[]) {
  const manque = points
    .filter((point) => point.obligatoire && !point.fait)
    .map((point) => point.libelle.toLowerCase());
  if (manque.length === 0)
    return "Vos voisins la voient dès qu'elle est publiée.";
  return `Il manque : ${manque.join(", ")}.`;
}

/**
 * La colonne de droite de la page unique (ordinateur), qui reste visible pendant la saisie :
 * l'aperçu vivant de la carte, la liste « Il reste à remplir » et « Publier l'activité ». Sur
 * mobile, elle n'existe pas : le parcours en étapes a son récapitulatif et sa barre d'action.
 */
export function ColonneApercu({
  saisie,
  lieu,
  photo,
  points,
  enCours,
  message,
  voirActivite,
  onPublier,
}: Props) {
  const toutFait = points.every((point) => point.fait);
  return (
    // Plus haute que la fenêtre, la colonne défile sur elle-même : « Publier l'activité » reste
    // atteignable. Le petit padding laisse la place à l'anneau de focus, que `overflow` rognerait.
    <aside
      aria-label="Aperçu et publication"
      className="hidden desktop:sticky desktop:top-6 desktop:flex desktop:max-h-[calc(100dvh-3rem)] desktop:flex-col desktop:gap-5 desktop:overflow-x-hidden desktop:overflow-y-auto desktop:p-1"
    >
      <div className="flex flex-col gap-space-sm">
        <p className="flex items-center gap-space-xs font-headline text-label-lg text-on-surface-variant">
          <Icone nom="visibility" taille={22} />
          Ce que verront vos voisins
        </p>
        <ApercuActivite
          titre={saisie.titre.trim()}
          categorie={saisie.categorie}
          pictogramme={pictogrammeDeLaSaisie(saisie)}
          description={saisie.description.trim()}
          creneau={resumeCreneau(saisie)}
          lieu={lieu}
          places={resumePlaces(saisie)}
          etiquettes={saisie.etiquettes}
          photo={photo}
        />
      </div>

      <section
        aria-labelledby="reste-a-remplir"
        className="rounded-lg bg-fond-carte px-6 py-5 shadow-carte"
      >
        <h3
          id="reste-a-remplir"
          className="font-headline text-headline-sm text-on-surface"
        >
          {toutFait
            ? "Tout est rempli, vous pouvez publier"
            : "Il reste à remplir"}
        </h3>
        <ul className="mt-space-xs flex flex-col">
          {points.map((point) => (
            <li key={point.cle}>
              <a
                href={`#bloc-${point.bloc}`}
                className="-mx-2.5 flex min-h-11 items-center gap-3 rounded-md px-2.5 text-body-lg text-on-surface hover:bg-surface-container-low"
              >
                <span
                  aria-hidden="true"
                  data-fait={point.fait}
                  className={`flex size-[26px] shrink-0 items-center justify-center rounded-full transition-colors duration-(--duree-courte) ease-journal ${
                    point.fait
                      ? "bg-fond-confirme text-texte-confirme"
                      : "border-2 border-outline bg-surface-container-low text-transparent"
                  }`}
                >
                  <Icone nom="check" taille={20} />
                </span>
                <span
                  className={point.fait ? "text-on-surface-variant" : undefined}
                >
                  {point.libelle}
                </span>
                {point.etat && (
                  <small className="ml-auto text-body-md text-on-surface-variant">
                    {point.etat}
                  </small>
                )}
              </a>
            </li>
          ))}
        </ul>
      </section>

      <div className="flex flex-col gap-space-sm">
        <Annonce message={message} erreur />
        {voirActivite ? (
          <Link
            href={voirActivite}
            className={`${classesBouton("action", true)} text-body-lg`}
          >
            Voir l&apos;activité
          </Link>
        ) : (
          <>
            <Bouton
              icone="check"
              pleineLargeur
              disabled={enCours}
              onClick={onPublier}
              aria-describedby="note-de-publication"
              className="text-body-lg"
            >
              {enCours ? "Publication…" : "Publier l'activité"}
            </Bouton>
            <p
              id="note-de-publication"
              className="text-center text-body-md text-on-surface-variant"
            >
              {noteDePublication(points)}
            </p>
          </>
        )}
      </div>
    </aside>
  );
}
