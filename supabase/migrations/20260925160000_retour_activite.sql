-- Retours sur une activité passée : chaque participant note de 1 à 5 et commente en quelques
-- mots, une seule fois. L'organisateur et le conseil syndical voient la note moyenne et les
-- commentaires. Ticket #16.

create table public.retour (
  id uuid primary key default gen_random_uuid(),
  activite_id uuid not null references public.activite (id) on delete cascade,
  resident_id uuid not null references public.profil (id) on delete cascade,
  note smallint not null check (note between 1 and 5),
  commentaire text not null check (length(trim(commentaire)) between 1 and 300),
  laisse_le timestamptz not null default now(),
  unique (activite_id, resident_id)
);

comment on table public.retour is 'Le retour d''un participant sur une activité passée : une note de 1 à 5 et un commentaire court, un seul par participant et par activité.';
comment on column public.retour.commentaire is '300 caractères au plus, jamais vide.';

alter table public.retour enable row level security;

revoke all on public.retour from anon, authenticated;
-- Personne ne lit ni n'écrit directement sur la table : la lecture agrégée passe par
-- `retours_activite` (organisateur et conseil syndical) et par les colonnes `mon_retour_*` de
-- `fiche_activite` (l'auteur du retour) ; l'écriture par `laisser_retour`. Toutes trois vérifient
-- elles-mêmes qui peut voir ou écrire quoi, en `security definer`.

/** Vrai si l'activité désignée par son id interne est terminée (date et heure de fin passées). */
create function public.activite_est_passee(p_activite uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (a.date_activite + a.heure_fin) < now()
  from public.activite a
  where a.id = p_activite;
$$;

/**
 * Dépose ou remplace le retour de la personne connectée sur l'activité désignée par son
 * identifiant public. Vérifie atomiquement qu'elle peut participer, qu'elle était bien inscrite,
 * et que l'activité est terminée : un retour ne se laisse jamais par avance.
 */
create function public.laisser_retour(
  p_identifiant text,
  p_note smallint,
  p_commentaire text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  id_activite uuid;
begin
  if not public.peut_participer() then
    raise exception 'Seul un résident validé peut laisser un retour' using errcode = '42501';
  end if;

  select a.id into id_activite
  from public.activite a
  where a.identifiant_public = p_identifiant;
  if not found then
    raise exception 'Activité introuvable' using errcode = 'P0002';
  end if;

  if not exists (
    select 1 from public.inscription_activite i
    where i.activite_id = id_activite and i.resident_id = (select auth.uid())
  ) then
    raise exception 'Seul un participant inscrit peut laisser un retour' using errcode = '42501';
  end if;

  if not public.activite_est_passee(id_activite) then
    raise exception 'L''activité n''est pas encore terminée' using errcode = 'P0003';
  end if;

  insert into public.retour (activite_id, resident_id, note, commentaire)
  values (id_activite, (select auth.uid()), p_note, trim(p_commentaire))
  on conflict (activite_id, resident_id) do update
    set note = excluded.note, commentaire = excluded.commentaire;
end;
$$;

revoke execute on function public.laisser_retour(text, smallint, text) from public, anon;
grant execute on function public.laisser_retour(text, smallint, text) to authenticated;

/**
 * La note moyenne et les commentaires d'une activité, réservés à son organisateur et au conseil
 * syndical : aucune ligne pour qui d'autre la consulte, plutôt qu'une erreur, pour ne pas
 * distinguer « activité introuvable » de « pas le droit de voir ses retours ».
 */
create function public.retours_activite(identifiant text)
returns table (
  note_moyenne numeric,
  nombre_retours integer,
  commentaires jsonb
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    round(avg(r.note), 1),
    count(r.id)::integer,
    coalesce(
      jsonb_agg(jsonb_build_object('note', r.note, 'commentaire', r.commentaire) order by r.laisse_le desc)
        filter (where r.id is not null),
      '[]'::jsonb
    )
  from public.activite a
  left join public.retour r on r.activite_id = a.id
  join public.profil p on p.id = a.organisateur
  where a.identifiant_public = identifiant
    and (a.organisateur = (select auth.uid()) or (select auth.uid()) in (
      select id from public.profil where role = 'syndic' and statut = 'valide'
    ))
  group by a.id;
$$;

revoke execute on function public.retours_activite(text) from public, anon;
grant execute on function public.retours_activite(text) to authenticated;

-- La fiche indique à l'auteur le retour qu'il a déjà laissé, pour préremplir ou remplacer
-- l'invitation à donner son avis par une confirmation.
drop function public.fiche_activite(text);

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
  mon_retour_note smallint,
  mon_retour_commentaire text
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
    (
      select r.note from public.retour r
      where r.activite_id = a.id and r.resident_id = auth.uid()
    ),
    (
      select r.commentaire from public.retour r
      where r.activite_id = a.id and r.resident_id = auth.uid()
    )
  from public.activite a
  join public.profil p on p.id = a.organisateur
  where a.identifiant_public = identifiant;
$$;

revoke execute on function public.fiche_activite(text) from public;
grant execute on function public.fiche_activite(text) to anon, authenticated;
