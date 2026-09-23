/** Étages proposés à l'inscription, du rez-de-chaussée (0) au 20e. */
export const ETAGES = Array.from({ length: 21 }, (_, etage) => etage);

/** « Rez-de-chaussée », « 1er étage », « 2e étage »… */
export function libelleEtage(etage: number) {
  if (etage === 0) return "Rez-de-chaussée";
  return `${etage}${etage === 1 ? "er" : "e"} étage`;
}
