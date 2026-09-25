import { Avatar } from "./avatar";

type Props = { initiale: string; nom: string; libelle?: string };

/** Qui organise, sur la fiche d'une activité, sous le panneau d'infos. */
export function ProposePar({ initiale, nom, libelle = "Proposé par" }: Props) {
  return (
    <div className="flex items-center gap-space-sm">
      <Avatar initiale={initiale} />
      <p className="text-body-lg text-on-surface">
        <span className="block text-body-md text-on-surface-variant">
          {libelle}
        </span>
        <strong className="font-headline">{nom}</strong>
      </p>
    </div>
  );
}
