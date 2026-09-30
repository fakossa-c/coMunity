-- Espace commun : plusieurs photos, dimensions, hauteur sous plafond et plan de situation
-- (ticket #135, spec #125). Le conseil syndical les saisit depuis l'espace syndic, les résidents
-- validés et en attente les lisent avec l'espace (les politiques de `espace_commun` s'appliquent
-- aux nouvelles colonnes) et les fichiers vivent dans le bucket privé `espaces-communs` du
-- ticket #93, dont les politiques couvrent déjà le dépôt, le retrait et la lecture.
-- Migration additive : des colonnes, une fonction et un déclencheur nouveaux, rien n'est retiré ni
-- renommé. Le code de `main`, qui ne connaît que `photo_chemin`, continue de marcher : la photo
-- unique du ticket #93 est la première de la liste, et l'écrire seule met la liste à jour.

/** Vrai pour une liste de 5 chemins de photos au plus, chacun du bucket et sans doublon. */
create function public.photos_espace_valides(p_chemins text[])
returns boolean
language sql
immutable
set search_path = ''
as $$
  select cardinality(p_chemins) <= 5
    and not exists (
      select 1 from unnest(p_chemins) c
      where c is null
        or c !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.jpg$'
    )
    and (select count(distinct c) from unnest(p_chemins) c) = cardinality(p_chemins);
$$;

revoke execute on function public.photos_espace_valides(text[]) from public, anon;
grant execute on function public.photos_espace_valides(text[]) to authenticated, service_role;

alter table public.espace_commun
  add column photos text[] not null default '{}'
    constraint espace_commun_photos_valides check (public.photos_espace_valides(photos)),
  add column longueur_m numeric(5, 2)
    constraint espace_commun_longueur_plage check (longueur_m between 0.5 and 100),
  add column largeur_m numeric(5, 2)
    constraint espace_commun_largeur_plage check (largeur_m between 0.5 and 100),
  add column hauteur_plafond_m numeric(4, 2)
    constraint espace_commun_hauteur_plafond_plage check (hauteur_plafond_m between 1 and 15),
  add column plan_chemin text
    constraint espace_commun_plan_chemin_valide
      check (plan_chemin ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.jpg$'),
  add constraint espace_commun_dimensions_ensemble check ((longueur_m is null) = (largeur_m is null));

-- Un plan ne sert qu'un espace : supprimer l'un ne retire pas le plan d'un autre.
create unique index espace_commun_plan_chemin_unique
  on public.espace_commun (plan_chemin)
  where plan_chemin is not null;

comment on column public.espace_commun.photos is 'Chemins des photos dans le bucket `espaces-communs`, dans l''ordre : la première est l''image de la carte. Au plus 5. `photo_chemin` en est toujours la première, tenue à jour par `synchroniser_photos_espace`.';
comment on column public.espace_commun.longueur_m is 'Longueur en mètres, de 0,5 à 100 ; `null` sans dimensions. Va avec `largeur_m`.';
comment on column public.espace_commun.largeur_m is 'Largeur en mètres, de 0,5 à 100 ; `null` sans dimensions. Va avec `longueur_m`.';
comment on column public.espace_commun.hauteur_plafond_m is 'Hauteur sous plafond en mètres, de 1 à 15 ; `null` sans hauteur renseignée.';
comment on column public.espace_commun.plan_chemin is 'Chemin du plan de situation dans le bucket `espaces-communs` ; `null` sans plan. Un plan ne se remplace pas sur place : le nouveau a un nouveau chemin.';

grant insert (photos, longueur_m, largeur_m, hauteur_plafond_m, plan_chemin) on public.espace_commun to authenticated;
grant update (photos, longueur_m, largeur_m, hauteur_plafond_m, plan_chemin) on public.espace_commun to authenticated;

/**
 * Tient `photos` et `photo_chemin` d'accord. Écrire la liste met la première photo dans
 * `photo_chemin` ; écrire `photo_chemin` seul (le code de `main`, avant les photos multiples)
 * en fait la seule photo de la liste, ou vide la liste.
 */
create function public.synchroniser_photos_espace()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    if cardinality(new.photos) > 0 then
      new.photo_chemin := new.photos[1];
    elsif new.photo_chemin is not null then
      new.photos := array[new.photo_chemin];
    end if;
  elsif new.photos is distinct from old.photos then
    new.photo_chemin := new.photos[1];
  elsif new.photo_chemin is distinct from old.photo_chemin then
    new.photos := case when new.photo_chemin is null then '{}' else array[new.photo_chemin] end;
  end if;
  return new;
end;
$$;

create trigger espace_commun_synchroniser_photos
  before insert or update on public.espace_commun
  for each row execute function public.synchroniser_photos_espace();

-- La photo unique existante devient la première photo, sans perte.
update public.espace_commun
set photos = array[photo_chemin]
where photo_chemin is not null;
