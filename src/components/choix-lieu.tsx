import { Champ, ChampListe } from "@/components/champ";
import { EncartPastel } from "@/components/encart-pastel";
import { EquipementsEspace } from "@/components/equipements-espace";
import { resumeEspace, type EspaceCommun } from "@/lib/espaces-communs";
import { LIEU_LIBRE } from "@/lib/proposition-activite";

type Props = {
  espaces: EspaceCommun[];
  /** L'identifiant de l'espace choisi, `LIEU_LIBRE` pour « Ailleurs… », `""` avant tout choix. */
  espaceCommun: string;
  /** Le lieu saisi à la main, pour « Ailleurs… ». */
  lieu: string;
  onEspaceChange: (valeur: string) => void;
  onLieuChange: (valeur: string) => void;
  erreurEspace?: string;
  erreurLieu?: string;
};

/**
 * Le lieu d'une activité : une liste déroulante avec les espaces communs de la résidence puis
 * « Ailleurs… ». L'espace choisi montre dessous son résumé, ses badges et ses consignes ;
 * « Ailleurs… » ouvre le champ libre. Sans espace commun enregistré, pas de liste : un message
 * au-dessus du champ libre.
 */
export function ChoixLieu({
  espaces,
  espaceCommun,
  lieu,
  onEspaceChange,
  onLieuChange,
  erreurEspace,
  erreurLieu,
}: Props) {
  const espace = espaces.find((e) => e.id === espaceCommun);

  return (
    <>
      {espaces.length === 0 ? (
        <p className="text-body-lg text-on-surface-variant">
          Le conseil syndical n&apos;a pas encore enregistré d&apos;espace
          commun. Indiquez le lieu ci-dessous.
        </p>
      ) : (
        <ChampListe
          libelle="Lieu"
          name="espace_commun"
          value={espaceCommun}
          onChange={(e) => onEspaceChange(e.target.value)}
          erreur={erreurEspace}
          required
        >
          <option value="" disabled>
            Choisir un lieu
          </option>
          {espaces.map(({ id, nom }) => (
            <option key={id} value={id}>
              {nom}
            </option>
          ))}
          <option value={LIEU_LIBRE}>Ailleurs…</option>
        </ChampListe>
      )}
      {espace && (
        <EncartPastel titre={espace.nom}>
          <div className="flex flex-col gap-space-xs">
            <p>{resumeEspace(espace)}</p>
            <EquipementsEspace equipements={espace.equipements} />
            {espace.consignes && (
              <p>
                <strong className="font-headline">Consignes : </strong>
                {espace.consignes}
              </p>
            )}
          </div>
        </EncartPastel>
      )}
      {espaceCommun === LIEU_LIBRE && (
        <Champ
          libelle="Nom du lieu"
          name="lieu"
          autoComplete="off"
          value={lieu}
          onChange={(e) => onLieuChange(e.target.value)}
          erreur={erreurLieu}
          aide="Par exemple : chez vous, 2e étage."
          required
        />
      )}
    </>
  );
}
