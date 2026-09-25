-- Parcours de création en 4 étapes (ticket #9) : minimum de participants, étiquettes
-- d'accessibilité et « pour qui » en listes fermées, textes de la fiche (mot d'accueil, conseils
-- pratiques, matériel à prévoir, ce que vous pouvez apporter) et précision d'accès au lieu.

create type public.etiquette_activite as enum (
  -- Accessibilité
  'acces_plain_pied',
  'ascenseur',
  'chaises_prevues',
  'sieges_confortables',
  'ambiance_calme',
  -- Pour qui
  'enfants_bienvenus',
  'tous_ages',
  'animaux_acceptes'
);

comment on type public.etiquette_activite is 'Les deux listes fermées d''étiquettes d''une activité : accessibilité, puis pour qui. Les libellés vivent dans le code (src/lib/etiquettes-activite.ts).';

alter table public.activite
  add column capacite_min integer check (capacite_min > 0),
  add column etiquettes public.etiquette_activite[] not null default '{}',
  add column mot_accueil text check (length(mot_accueil) <= 300),
  add column conseils_pratiques text,
  add column materiel_prevoir text,
  add column a_apporter text,
  add column precision_acces text check (length(precision_acces) <= 120),
  add constraint activite_minimum_sous_capacite
    check (capacite_min is null or capacite_max is null or capacite_min <= capacite_max);

comment on column public.activite.capacite_min is '`null` : pas de minimum. Sinon le nombre de participants sous lequel l''activité n''a pas lieu ; jamais au-dessus de `capacite_max`.';
comment on column public.activite.etiquettes is 'Étiquettes cochées par l''organisateur, parmi les listes fermées de `etiquette_activite` ; vide par défaut.';
comment on column public.activite.mot_accueil is 'Le mot d''accueil de l''organisateur, encart « À savoir » de la fiche : 300 caractères au plus.';
comment on column public.activite.precision_acces is 'Comment trouver le lieu (« portail vert, au fond de la cour ») : 120 caractères au plus.';

grant insert (
  capacite_min, etiquettes, mot_accueil, conseils_pratiques, materiel_prevoir, a_apporter, precision_acces
) on public.activite to authenticated;
grant update (
  capacite_max, capacite_min, etiquettes, mot_accueil, conseils_pratiques, materiel_prevoir, a_apporter, precision_acces
) on public.activite to authenticated;

-- La fiche restitue tout ce que le parcours a saisi.
drop function public.fiche_activite(text);

/**
 * La fiche d'une activité, lisible par tous à partir de son identifiant public. La jauge
 * (places prises et capacité, `null` si l'activité n'en a pas) est toujours donnée ;
 * l'inscription de la personne connectée n'est donnée qu'à elle-même.
 */
create function public.fiche_activite(identifiant text)
returns table (
  identifiant_public text,
  titre text,
  categorie public.categorie_activite,
  pictogramme text,
  description text,
  date_activite date,
  heure_debut time,
  heure_fin time,
  lieu text,
  proposee_par_syndic boolean,
  organisateur_nom_affiche text,
  est_organisateur boolean,
  capacite_max integer,
  places_prises integer,
  mes_accompagnants smallint,
  capacite_min integer,
  etiquettes public.etiquette_activite[],
  mot_accueil text,
  conseils_pratiques text,
  materiel_prevoir text,
  a_apporter text,
  precision_acces text
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    a.identifiant_public,
    a.titre,
    a.categorie,
    a.pictogramme,
    a.description,
    a.date_activite,
    a.heure_debut,
    a.heure_fin,
    a.lieu,
    p.role = 'syndic',
    case when public.peut_consulter() then public.nom_affiche(p.prenom, p.nom) end,
    a.organisateur is not distinct from auth.uid(),
    a.capacite_max,
    public.places_prises(a.id),
    (
      select i.accompagnants from public.inscription_activite i
      where i.activite_id = a.id and i.resident_id = auth.uid()
    ),
    a.capacite_min,
    a.etiquettes,
    a.mot_accueil,
    a.conseils_pratiques,
    a.materiel_prevoir,
    a.a_apporter,
    a.precision_acces
  from public.activite a
  join public.profil p on p.id = a.organisateur
  where a.identifiant_public = identifiant;
$$;

revoke execute on function public.fiche_activite(text) from public;
grant execute on function public.fiche_activite(text) to anon, authenticated;

-- La carte du catalogue affiche les étiquettes.
drop function public.catalogue_activites();

/**
 * Les activités à venir, comme le catalogue de l'accueil, avec l'inscription de la personne
 * connectée et les étiquettes de chaque activité. Minimale à dessein : #15 (Accueil groupé par
 * jour) reviendra sur cette page.
 */
create function public.catalogue_activites()
returns table (
  id uuid,
  identifiant_public text,
  titre text,
  categorie public.categorie_activite,
  pictogramme text,
  date_activite date,
  heure_debut time,
  lieu text,
  capacite_max integer,
  places_prises integer,
  mes_accompagnants smallint,
  etiquettes public.etiquette_activite[]
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    a.id,
    a.identifiant_public,
    a.titre,
    a.categorie,
    a.pictogramme,
    a.date_activite,
    a.heure_debut,
    a.lieu,
    a.capacite_max,
    public.places_prises(a.id),
    (
      select i.accompagnants from public.inscription_activite i
      where i.activite_id = a.id and i.resident_id = auth.uid()
    ),
    a.etiquettes
  from public.activite a
  where a.date_activite >= current_date and public.peut_consulter()
  order by a.date_activite, a.heure_debut;
$$;

revoke execute on function public.catalogue_activites() from public, anon;
grant execute on function public.catalogue_activites() to authenticated;
