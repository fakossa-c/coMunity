-- Activités : création par un résident validé ou le syndic, catalogue public aux comptes actifs.

create type public.categorie_activite as enum (
  'moments_partages',
  'creation_bricolage',
  'culture_loisirs',
  'entraide_partage',
  'jardin_nature'
);

create table public.activite (
  id uuid primary key default gen_random_uuid(),
  titre text not null check (length(trim(titre)) between 1 and 50),
  categorie public.categorie_activite not null,
  pictogramme text not null check (length(trim(pictogramme)) > 0),
  description text,
  date_activite date not null,
  heure_debut time not null,
  heure_fin time not null check (heure_fin > heure_debut),
  lieu text not null check (length(trim(lieu)) > 0),
  organisateur uuid not null default auth.uid() references public.profil (id) on delete cascade,
  publiee_le timestamptz not null default now()
);

comment on table public.activite is 'Une activité proposée aux résidents, avec son pictogramme choisi dans la bibliothèque versionnée dans le code.';
comment on column public.activite.pictogramme is 'Identifiant d''un pictogramme de la bibliothèque côté code, pas une référence en base.';

alter table public.activite enable row level security;

revoke all on public.activite from anon, authenticated;
grant select on public.activite to authenticated;
grant insert (
  titre, categorie, pictogramme, description,
  date_activite, heure_debut, heure_fin, lieu, organisateur
) on public.activite to authenticated;
grant update (
  titre, categorie, pictogramme, description,
  date_activite, heure_debut, heure_fin, lieu
) on public.activite to authenticated;

create policy "Les comptes actifs consultent les activités"
  on public.activite for select
  to authenticated
  using ((select public.peut_consulter()));

create policy "Un compte actif publie ses activités"
  on public.activite for insert
  to authenticated
  with check (
    (select public.peut_participer())
    and organisateur = (select auth.uid())
  );

create policy "L'organisateur modifie ses propres activités"
  on public.activite for update
  to authenticated
  using (organisateur = (select auth.uid()))
  with check (
    (select public.peut_participer())
    and organisateur = (select auth.uid())
  );
