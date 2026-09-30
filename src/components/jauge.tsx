import { useId } from "react";
import {
  libelleJauge,
  placesRestantesDe,
  type JaugeActivite,
} from "@/lib/inscription-activite";

/**
 * « 8 inscrits sur 12 places » avec une barre de remplissage ; « 8 inscrits » sans capacité.
 * La barre prend ce texte pour nom : un lecteur d'écran dit de quoi elle parle.
 */
export function Jauge(jauge: JaugeActivite) {
  const idLibelle = useId();
  const restantes = placesRestantesDe(jauge);
  const pourcentage =
    restantes === null
      ? null
      : Math.min(
          100,
          Math.round((jauge.placesPrises / jauge.capaciteMax!) * 100),
        );

  return (
    <div className="flex flex-col gap-1">
      {pourcentage !== null && (
        <div
          role="progressbar"
          aria-labelledby={idLibelle}
          aria-valuenow={jauge.placesPrises}
          aria-valuemin={0}
          aria-valuemax={jauge.capaciteMax ?? undefined}
          className="h-2 w-full overflow-hidden rounded-full bg-surface-container-low"
        >
          <div
            className="h-full rounded-full bg-primary"
            style={{ width: `${pourcentage}%` }}
          />
        </div>
      )}
      <p id={idLibelle} className="text-body-md text-on-surface-variant">
        {libelleJauge(jauge)}
      </p>
    </div>
  );
}
