/** « 1re », « 2e » : la place d'un élément dans une liste que le conseil syndical réordonne. */
export function rangOrdinal(rang: number) {
  return rang === 1 ? "1re" : `${rang}e`;
}
