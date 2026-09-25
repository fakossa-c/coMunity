-- Inscription à une activité : un résident validé s'inscrit avec d'éventuels accompagnants,
-- dans la limite des places restantes quand l'activité en a une. Ticket #8, spec #1
-- (modèle Activité : capacité maximale optionnelle ; story 56 : le créateur la fixe ou non).

alter table public.activite
  add column capacite_max integer check (capacite_max > 0);

comment on column public.activite.capacite_max is '`null` : pas de limite de participants. Le formulaire de création la propose à partir du ticket #9.';

grant insert (capacite_max) on public.activite to authenticated;

create table public.inscription_activite (
  id uuid primary key default gen_random_uuid(),
  activite_id uuid not null references public.activite (id) on delete cascade,
  resident_id uuid not null references public.profil (id) on delete cascade,
  accompagnants smallint not null default 0 check (accompagnants >= 0),
  inscrit_le timestamptz not null default now(),
  unique (activite_id, resident_id)
);

comment on table public.inscription_activite is 'Une inscription d''un résident à une activité, avec le nombre de personnes qu''il accompagne.';

alter table public.inscription_activite enable row level security;

revoke all on public.inscription_activite from anon, authenticated;
grant select on public.inscription_activite to authenticated;

create policy "Un compte actif voit les inscriptions d'une activité qu'il consulte"
  on public.inscription_activite for select
  to authenticated
  using ((select public.peut_consulter()));

-- Personne n'écrit directement sur la table : l'inscription et l'annulation passent par des
-- fonctions qui vérifient atomiquement le statut du résident, celui de l'activité et les places.
-- Les paramètres sont préfixés `p_` : `activite` seul se confondrait avec la table du même nom.
-- Comme `fiche_activite`, elles prennent l'identifiant public : l'identifiant interne ne circule
-- jamais côté client.

/** Le nombre de personnes déjà inscrites à une activité, accompagnants compris. */
create function public.places_prises(p_activite uuid)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(sum(1 + accompagnants), 0)::integer
  from public.inscription_activite
  where activite_id = p_activite;
$$;

revoke execute on function public.places_prises(uuid) from public, anon;
grant execute on function public.places_prises(uuid) to authenticated;

/**
 * Inscrit la personne connectée à l'activité désignée par son identifiant public, avec
 * `p_accompagnants` personnes en plus. Vérifie atomiquement que le compte peut participer et,
 * si l'activité a une capacité, qu'il reste assez de places : la capacité est revérifiée dans
 * la même transaction que l'insertion, verrou sur la ligne de l'activité, pour qu'une dernière
 * place ne parte jamais deux fois. Sans capacité, aucune limite : ni sur les places, ni sur le
 * nombre d'accompagnants.
 */
create function public.s_inscrire(p_identifiant text, p_accompagnants smallint default 0)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  id_activite uuid;
  capacite_activite integer;
  total_places_prises integer;
begin
  if not public.peut_participer() then
    raise exception 'Seul un résident validé peut s''inscrire' using errcode = '42501';
  end if;
  if p_accompagnants < 0 then
    raise exception 'Le nombre d''accompagnants ne peut pas être négatif' using errcode = '23514';
  end if;

  select id, capacite_max into id_activite, capacite_activite
  from public.activite
  where identifiant_public = p_identifiant
  for update;
  if not found then
    raise exception 'Activité introuvable' using errcode = 'P0002';
  end if;

  if capacite_activite is not null then
    select coalesce(sum(1 + i.accompagnants), 0) into total_places_prises
    from public.inscription_activite i
    where i.activite_id = id_activite;

    if total_places_prises + 1 + p_accompagnants > capacite_activite then
      raise exception 'Il ne reste pas assez de places' using errcode = 'P0003';
    end if;
  end if;

  insert into public.inscription_activite (activite_id, resident_id, accompagnants)
  values (id_activite, (select auth.uid()), p_accompagnants)
  on conflict (activite_id, resident_id) do update
    set accompagnants = excluded.accompagnants;
end;
$$;

revoke execute on function public.s_inscrire(text, smallint) from public, anon;
grant execute on function public.s_inscrire(text, smallint) to authenticated;

/** Annule l'inscription de la personne connectée à l'activité désignée par son identifiant public. */
create function public.se_desister(p_identifiant text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.inscription_activite i
  using public.activite a
  where a.id = i.activite_id
    and a.identifiant_public = p_identifiant
    and i.resident_id = (select auth.uid());
  if not found then
    raise exception 'Vous n''êtes pas inscrit à cette activité' using errcode = 'P0002';
  end if;
end;
$$;

revoke execute on function public.se_desister(text) from public, anon;
grant execute on function public.se_desister(text) to authenticated;

-- La fiche gagne la jauge et l'état d'inscription de la personne qui la consulte.
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
  mes_accompagnants smallint
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
    )
  from public.activite a
  join public.profil p on p.id = a.organisateur
  where a.identifiant_public = identifiant;
$$;

revoke execute on function public.fiche_activite(text) from public;
grant execute on function public.fiche_activite(text) to anon, authenticated;

/**
 * Les participants d'une activité, nom affiché compris pour un compte qui peut consulter
 * la résidence ; un visiteur n'obtient rien (le nombre vient déjà de la fiche).
 */
create function public.participants_activite(identifiant text)
returns table (nom_affiche text, accompagnants smallint)
language sql
stable
security definer
set search_path = ''
as $$
  select public.nom_affiche(p.prenom, p.nom), i.accompagnants
  from public.inscription_activite i
  join public.activite a on a.id = i.activite_id
  join public.profil p on p.id = i.resident_id
  where a.identifiant_public = identifiant and public.peut_consulter()
  order by i.inscrit_le;
$$;

revoke execute on function public.participants_activite(text) from public, anon;
grant execute on function public.participants_activite(text) to authenticated;
