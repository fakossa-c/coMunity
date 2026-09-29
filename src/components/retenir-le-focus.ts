import type { KeyboardEvent } from "react";

const CIBLES =
  'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Garde la touche Tab dans une boîte de dialogue : depuis le dernier élément, elle revient au
 * premier, et inversement avec Maj. À poser sur le `onKeyDown` du `<dialog>` modal.
 */
export function retenirLeFocus(e: KeyboardEvent<HTMLElement>) {
  if (e.key !== "Tab") return;
  // Un élément masqué (`display: none`) n'a pas de boîte et ne peut pas prendre le focus.
  const cibles = [
    ...e.currentTarget.querySelectorAll<HTMLElement>(CIBLES),
  ].filter((cible) => cible.getClientRects().length > 0);
  const premiere = cibles[0];
  const derniere = cibles[cibles.length - 1];
  if (!premiere) return;
  if (e.shiftKey && document.activeElement === premiere) {
    e.preventDefault();
    derniere.focus();
  } else if (!e.shiftKey && document.activeElement === derniere) {
    e.preventDefault();
    premiere.focus();
  }
}
