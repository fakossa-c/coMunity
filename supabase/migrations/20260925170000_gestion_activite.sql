-- Gestion d'une activité par son créateur (ticket #12, spec #57) : modifier, annuler, supprimer.
-- Une activité avec des inscrits est annulée plutôt que supprimée ; la capacité ne descend jamais
-- sous le nombre de personnes inscrites.

create type public.statut_activite as enum ('publiee', 'annulee');

comment on type public.statut_activite is 'L''état d''une activité : publiée, ou annulée par son créateur (elle reste visible de ses inscrits).';

alter table public.activite
  add column statut public.statut_activite not null default 'publiee';

comment on column public.activite.statut is '`publiee` par défaut ; `annulee` par `annuler_activite`, jamais par une modification directe (la colonne ne figure dans aucun grant).';

-- La capacité maximale se modifie enfin (#9 l'avait laissée hors du droit de modification), à
-- condition de ne pas passer sous le nombre de personnes déjà inscrites, accompagnants compris.
grant update (capacite_max) on public.activite to authenticated;

/**
 * Refuse une capacité inférieure aux personnes inscrites. Elle s'exécute après le verrou de la
 * ligne : `s_inscrire` verrouille la même ligne, donc une inscription concurrente est comptée.
 */
create function public.verifier_capacite_activite()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  places integer;
begin
  select coalesce(sum(1 + i.accompagnants), 0) into places
  from public.inscription_activite i
  where i.activite_id = new.id;

  if new.capacite_max is not null and new.capacite_max < places then
    raise exception 'La capacité ne peut pas passer sous le nombre de personnes inscrites'
      using errcode = 'P0005';
  end if;
  return new;
end;
$$;

revoke execute on function public.verifier_capacite_activite() from public, anon, authenticated;

create trigger activite_capacite_sous_inscrits
  before update of capacite_max on public.activite
  for each row
  when (new.capacite_max is distinct from old.capacite_max)
  execute function public.verifier_capacite_activite();

-- Une activité annulée ne se modifie plus.
drop policy "L'organisateur modifie ses propres activités" on public.activite;

create policy "L'organisateur modifie ses activités publiées"
  on public.activite for update
  to authenticated
  using (organisateur = (select auth.uid()) and statut = 'publiee')
  with check (
    (select public.peut_participer())
    and organisateur = (select auth.uid())
  );

/**
 * Annule l'activité désignée par son identifiant public. Réservée à son créateur ; les inscrits
 * gardent leur inscription et voient l'annulation. Sans effet sur une activité déjà annulée.
 */
create function public.annuler_activite(p_identifiant text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  createur uuid;
begin
  select organisateur into createur
  from public.activite
  where identifiant_public = p_identifiant
  for update;
  if not found then
    raise exception 'Activité introuvable' using errcode = 'P0002';
  end if;
  if createur is distinct from auth.uid() or not public.peut_participer() then
    raise exception 'Seul le créateur peut annuler son activité' using errcode = '42501';
  end if;

  update public.activite set statut = 'annulee' where identifiant_public = p_identifiant;
end;
$$;

revoke execute on function public.annuler_activite(text) from public, anon;
grant execute on function public.annuler_activite(text) to authenticated;

/**
 * Supprime l'activité désignée par son identifiant public. Réservée à son créateur, et refusée
 * dès qu'une personne y est inscrite : il faut alors l'annuler. Le verrou de la ligne, le même
 * que celui de `s_inscrire`, empêche qu'une inscription arrive pendant la suppression.
 */
create function public.supprimer_activite(p_identifiant text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  id_activite uuid;
  createur uuid;
begin
  select id, organisateur into id_activite, createur
  from public.activite
  where identifiant_public = p_identifiant
  for update;
  if not found then
    raise exception 'Activité introuvable' using errcode = 'P0002';
  end if;
  if createur is distinct from auth.uid() or not public.peut_participer() then
    raise exception 'Seul le créateur peut supprimer son activité' using errcode = '42501';
  end if;
  if exists (select 1 from public.inscription_activite where activite_id = id_activite) then
    raise exception 'Une activité avec des inscrits s''annule, elle ne se supprime pas'
      using errcode = 'P0006';
  end if;

  delete from public.activite where id = id_activite;
end;
$$;

revoke execute on function public.supprimer_activite(text) from public, anon;
grant execute on function public.supprimer_activite(text) to authenticated;

-- L'inscription est refusée sur une activité annulée.
create or replace function public.s_inscrire(p_identifiant text, p_accompagnants smallint default 0)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  id_activite uuid;
  capacite_activite integer;
  statut_actuel public.statut_activite;
  total_places_prises integer;
begin
  if not public.peut_participer() then
    raise exception 'Seul un résident validé peut s''inscrire' using errcode = '42501';
  end if;
  if p_accompagnants < 0 then
    raise exception 'Le nombre d''accompagnants ne peut pas être négatif' using errcode = '23514';
  end if;

  select id, capacite_max, statut into id_activite, capacite_activite, statut_actuel
  from public.activite
  where identifiant_public = p_identifiant
  for update;
  if not found then
    raise exception 'Activité introuvable' using errcode = 'P0002';
  end if;
  if statut_actuel = 'annulee' then
    raise exception 'Cette activité est annulée' using errcode = 'P0004';
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

-- La fiche donne le statut.
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
  precision_acces text,
  statut public.statut_activite
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
    a.precision_acces,
    a.statut
  from public.activite a
  join public.profil p on p.id = a.organisateur
  where a.identifiant_public = identifiant;
$$;

revoke execute on function public.fiche_activite(text) from public;
grant execute on function public.fiche_activite(text) to anon, authenticated;

-- Le catalogue donne le statut, et ne montre une activité annulée qu'à ses inscrits et à son
-- créateur.
drop function public.catalogue_activites();

/**
 * Les activités à venir, comme le catalogue de l'accueil, avec l'inscription de la personne
 * connectée, les étiquettes et le statut de chaque activité. Une activité annulée n'y figure que
 * pour ses inscrits et son créateur.
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
  etiquettes public.etiquette_activite[],
  statut public.statut_activite,
  capacite_min integer
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
    a.etiquettes,
    a.statut,
    a.capacite_min
  from public.activite a
  where a.date_activite >= current_date
    and public.peut_consulter()
    and (
      a.statut = 'publiee'
      or a.organisateur = auth.uid()
      or exists (
        select 1 from public.inscription_activite i
        where i.activite_id = a.id and i.resident_id = auth.uid()
      )
    )
  order by a.date_activite, a.heure_debut;
$$;

revoke execute on function public.catalogue_activites() from public, anon;
grant execute on function public.catalogue_activites() to authenticated;

/**
 * Les activités que la personne connectée organise, passées et à venir, annulées comprises :
 * l'onglet « J'organise ». Même forme que le catalogue, sans filtre de date.
 */
create function public.mes_activites_organisees()
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
  etiquettes public.etiquette_activite[],
  statut public.statut_activite,
  capacite_min integer
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
    a.etiquettes,
    a.statut,
    a.capacite_min
  from public.activite a
  where a.organisateur = auth.uid() and public.peut_consulter()
  order by a.date_activite, a.heure_debut;
$$;

revoke execute on function public.mes_activites_organisees() from public, anon;
grant execute on function public.mes_activites_organisees() to authenticated;
