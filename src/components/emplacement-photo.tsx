type Props = {
  /** L'adresse de la photo ; absente, l'emplacement reste rayé avec sa légende. */
  src?: string;
  /** Texte alternatif de la photo ; vide, la photo est décorative (la carte porte déjà le titre). */
  alt?: string;
  /** Légende de l'emplacement rayé (« photo · goûter au jardin »). */
  legende?: string;
  /** En tête de fiche : 150 px de haut et arrondi. Sinon 128 px, en haut d'une carte qui arrondit ses coins. */
  arrondi?: boolean;
  /** Pastille « 1 sur 4 » en bas à droite. */
  compteur?: string;
  className?: string;
};

/**
 * Photo d'une activité, sur son emplacement rayé : la photo se pose dessus quand elle a fini de
 * charger, et l'emplacement reste visible tant qu'il n'y en a pas.
 */
export function EmplacementPhoto({
  src,
  alt = "",
  legende,
  arrondi = false,
  compteur,
  className,
}: Props) {
  return (
    <div
      className={`relative overflow-hidden bg-rayures-photo ${
        arrondi ? "h-[150px] rounded-lg" : "h-32"
      } ${className ?? ""}`}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element -- photo du bucket public, déjà compressée dans le navigateur
        <img
          src={src}
          alt={alt}
          loading="lazy"
          className="absolute inset-0 size-full object-cover"
        />
      ) : (
        legende && (
          <span className="absolute inset-0 flex items-center justify-center px-4 text-center font-mono text-legende-photo text-on-surface-variant">
            {legende}
          </span>
        )
      )}
      {compteur && (
        <span className="absolute right-3 bottom-3 rounded-full bg-inverse-surface px-3 py-1 font-headline text-label-md text-inverse-on-surface">
          {compteur}
        </span>
      )}
    </div>
  );
}
