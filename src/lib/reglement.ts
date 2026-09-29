import type { ErreurFormulaire } from "./resultat";

/** Une suite de caractères d'une ligne, en gras ou non. */
export type Morceau = { texte: string; gras: boolean };

/** Un paragraphe (ses retours à la ligne simples sont gardés) ou une liste à puces. */
export type Bloc =
  | { type: "paragraphe"; morceaux: Morceau[] }
  | { type: "liste"; elements: Morceau[][] };

/** Ce que le conseil syndical saisit pour une section du règlement intérieur. */
export type SaisieSection = { titre: string; texte: string };
export type ChampSection = keyof SaisieSection;

/** Longueurs maximales, les mêmes que les contraintes en base. */
export const LIMITES_SECTION = { titre: 100, texte: 5000 } as const;

const PUCE = /^-\s+(\S.*)$/;
const GRAS = /\*\*(\S(?:[\s\S]*?\S)?)\*\*/g;

/** Découpe un texte en morceaux, le gras étant ce qui est entre deux paires d'étoiles. */
function morceaux(texte: string): Morceau[] {
  const resultat: Morceau[] = [];
  let debut = 0;
  for (const trouve of texte.matchAll(GRAS)) {
    if (trouve.index > debut)
      resultat.push({ texte: texte.slice(debut, trouve.index), gras: false });
    resultat.push({ texte: trouve[1], gras: true });
    debut = trouve.index + trouve[0].length;
  }
  if (debut < texte.length)
    resultat.push({ texte: texte.slice(debut), gras: false });
  return resultat;
}

/**
 * Lit le texte d'une section : les paragraphes sont séparés par une ligne vide, les lignes qui
 * commencent par un tiret et une espace forment une liste à puces, `**ainsi**` se met en gras.
 * Tout le reste, HTML compris, est du texte : rien n'est jamais interprété.
 */
export function decouperTexte(texte: string): Bloc[] {
  const blocs: Bloc[] = [];
  let lignes: string[] = [];
  let puces = false;

  function terminer() {
    if (lignes.length > 0)
      blocs.push(
        puces
          ? { type: "liste", elements: lignes.map(morceaux) }
          : { type: "paragraphe", morceaux: morceaux(lignes.join("\n")) },
      );
    lignes = [];
  }

  for (const brute of texte.replace(/\r\n?/g, "\n").split("\n")) {
    const ligne = brute.trim();
    if (ligne === "") {
      terminer();
      continue;
    }
    const puce = PUCE.exec(ligne);
    if (lignes.length > 0 && Boolean(puce) !== puces) terminer();
    puces = Boolean(puce);
    lignes.push(puce ? puce[1] : ligne);
  }
  terminer();
  return blocs;
}

/** La première erreur de la saisie, sous le champ qu'elle concerne ; `{}` quand tout va. */
export function verifierSection(
  saisie: SaisieSection,
): ErreurFormulaire<ChampSection> {
  const { titre, texte } = versSection(saisie);
  if (titre === "")
    return { champ: "titre", erreur: "Donnez un titre à la section." };
  if (titre.length > LIMITES_SECTION.titre)
    return {
      champ: "titre",
      erreur: `${LIMITES_SECTION.titre} caractères maximum.`,
    };
  if (texte === "")
    return { champ: "texte", erreur: "Écrivez le texte de la section." };
  if (texte.length > LIMITES_SECTION.texte)
    return {
      champ: "texte",
      erreur: `${LIMITES_SECTION.texte} caractères maximum.`,
    };
  return {};
}

/** Convertit la saisie en ligne à enregistrer : sans espaces autour, fins de ligne unifiées. */
export function versSection(saisie: SaisieSection): SaisieSection {
  return {
    titre: saisie.titre.trim(),
    texte: saisie.texte.replace(/\r\n?/g, "\n").trim(),
  };
}

const FORMAT_DATE = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "Europe/Paris",
});

/** « 29 septembre 2026 », « 1er janvier 2027 » : la date de dernière mise à jour du règlement, à l'heure de Paris. */
export function dateReglement(iso: string) {
  return FORMAT_DATE.format(new Date(iso)).replace(/^1 /, "1er ");
}
