import type { ReactNode } from "react";

type Props = {
  libelle: string;
  valeur: ReactNode;
  /** Une phrase qui situe le chiffre : « sur 4 activités ». */
  precision?: ReactNode;
};

/** Un chiffre du tableau de bord : son libellé, sa valeur en grand, une précision. À placer dans une liste de définitions (`dl`). */
export function ChiffreCle({ libelle, valeur, precision }: Props) {
  return (
    <div className="flex flex-col gap-1 rounded-lg border-[1.5px] border-bordure-carte bg-fond-carte p-space-md">
      <dt className="font-headline text-label-lg text-on-surface-variant">
        {libelle}
      </dt>
      <dd className="font-headline text-headline-xl-mobile text-on-surface desktop:text-headline-xl">
        {valeur}
      </dd>
      {precision && (
        <dd className="text-body-md text-on-surface-variant">{precision}</dd>
      )}
    </div>
  );
}
