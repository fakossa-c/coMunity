"use client";

import { Bouton } from "@/components/bouton";
import { Champ } from "@/components/champ";
import {
  LIMITES_SONDAGE,
  libelleEcheance,
  type ChampSondage,
  type SaisieSondage,
  type Sondage,
} from "@/lib/sondages";
import { erreurDuChamp, type ErreurFormulaire } from "@/lib/resultat";

type Props = {
  saisie: SaisieSondage;
  onChange: (saisie: SaisieSondage) => void;
  erreur: ErreurFormulaire<ChampSondage>;
};

/**
 * Le bloc sondage du formulaire d'annonce : la question, de 2 à 6 options et la date limite des
 * réponses. Sur ordinateur, la carte du formulaire remplace son contour.
 */
export function FormulaireSondage({ saisie, onChange, erreur }: Props) {
  const { options } = saisie;
  const erreurOptions = erreurDuChamp(erreur, "options");

  function poserOption(rang: number, libelle: string) {
    onChange({
      ...saisie,
      options: options.map((o, i) => (i === rang ? libelle : o)),
    });
  }

  return (
    <fieldset className="flex flex-col gap-bloc rounded-lg border-[1.5px] border-border-distinct/20 p-space-md desktop:border-0 desktop:p-0">
      <legend className="px-space-xs font-headline text-headline-sm desktop:mb-bloc desktop:px-0">
        Sondage
      </legend>
      <Champ
        libelle="Question"
        name="question"
        autoComplete="off"
        value={saisie.question}
        onChange={(e) => onChange({ ...saisie, question: e.target.value })}
        maxLength={LIMITES_SONDAGE.question}
        erreur={erreurDuChamp(erreur, "question")}
        placeholder="Quel créneau vous convient le mieux ?"
      />
      <div className="flex flex-col gap-space-sm">
        {options.map((libelle, rang) => (
          <div key={rang} className="flex items-end gap-space-sm">
            <Champ
              className="flex-1"
              libelle={`Option ${rang + 1}`}
              name={`option-${rang + 1}`}
              autoComplete="off"
              value={libelle}
              onChange={(e) => poserOption(rang, e.target.value)}
              maxLength={LIMITES_SONDAGE.option}
            />
            {options.length > LIMITES_SONDAGE.optionsMin && (
              <Bouton
                variante="fantome"
                icone="close"
                aria-label={`Retirer l'option ${rang + 1}`}
                onClick={() =>
                  onChange({
                    ...saisie,
                    options: options.filter((_, i) => i !== rang),
                  })
                }
              />
            )}
          </div>
        ))}
        {erreurOptions && (
          <p role="alert" className="font-headline text-label-lg text-error">
            {erreurOptions}
          </p>
        )}
        <Bouton
          variante="contour"
          icone="add"
          disabled={options.length >= LIMITES_SONDAGE.optionsMax}
          onClick={() => onChange({ ...saisie, options: [...options, ""] })}
        >
          Ajouter une option
        </Bouton>
      </div>
      <Champ
        libelle="Date limite des réponses"
        name="echeance"
        type="date"
        autoComplete="off"
        value={saisie.echeance}
        onChange={(e) => onChange({ ...saisie, echeance: e.target.value })}
        erreur={erreurDuChamp(erreur, "echeance")}
        aide="Dernier jour où l'on peut répondre. Ensuite, chacun lit les résultats."
      />
    </fieldset>
  );
}

/** Le sondage déjà publié d'une annonce, en lecture : il ne se modifie plus. */
export function SondagePublie({ sondage }: { sondage: Sondage }) {
  return (
    <section
      aria-label="Sondage"
      className="flex flex-col gap-space-sm rounded-lg border-[1.5px] border-border-distinct/20 p-space-md desktop:border-0 desktop:p-0"
    >
      <h2 className="font-headline text-headline-sm">Sondage</h2>
      <p className="font-headline text-body-bold">{sondage.question}</p>
      <ul className="list-disc pl-6 text-body-lg">
        {sondage.options.map((libelle, rang) => (
          <li key={rang}>{libelle}</li>
        ))}
      </ul>
      <p className="text-body-md text-on-surface-variant">
        Réponses jusqu&apos;au {libelleEcheance(sondage.echeance)}. Un sondage
        publié ne se modifie plus : supprimez l&apos;annonce pour en publier un
        autre.
      </p>
    </section>
  );
}
