import {
  equipementsEspace,
  type EquipementEspace,
} from "@/lib/espaces-communs";
import { Etiquette } from "./etiquette";

/** Les équipements et l'accessibilité d'un espace commun, en badges verts. Rien si aucun. */
export function EquipementsEspace({
  equipements,
}: {
  equipements: EquipementEspace[];
}) {
  if (equipements.length === 0) return null;
  return (
    <ul aria-label="Équipements" className="flex flex-wrap gap-space-xs">
      {equipements.map((cle) => (
        <li key={cle}>
          <Etiquette ton="vert" icone={equipementsEspace[cle].icone}>
            {equipementsEspace[cle].libelle}
          </Etiquette>
        </li>
      ))}
    </ul>
  );
}
