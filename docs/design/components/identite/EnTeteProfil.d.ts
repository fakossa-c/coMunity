export interface EnTeteProfilProps {
  initiale: string;
  nom: string;
  /** "Bât. B, 2e étage" */
  adresse?: string;
  /** grand : page Profil (avatar 72, titre h1) · compact : haut du MenuProfil (avatar 52) */
  taille?: "grand" | "compact";
}
export declare function EnTeteProfil(props: EnTeteProfilProps): JSX.Element;
