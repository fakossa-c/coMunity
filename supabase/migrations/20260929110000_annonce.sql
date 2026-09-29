-- Annonces du conseil syndical (ticket #13, spec #58). Une annonce est une information publiée
-- pour les résidents, sans inscription : elle dit « il y a du nouveau » et vieillit. Seul le
-- conseil syndical écrit ; un compte qui peut consulter lit ; un visiteur lit une annonce par
-- son lien public, jamais la liste.

create type public.type_annonce as enum ('assemblee', 'sondage', 'travaux', 'info');

comment on type public.type_annonce is 'Fixe la pastille, la couleur et le pictogramme d''une annonce. Les libellés vivent dans le code (src/lib/annonces.ts).';

create table public.annonce (
  id uuid primary key default gen_random_uuid(),
  identifiant_public text not null unique
    default public.nouvel_identifiant_public()
    check (identifiant_public ~ '^[a-z0-9]{12}$'),
  type public.type_annonce not null,
  titre text not null check (length(trim(titre)) between 1 and 100),
  texte text check (length(texte) <= 2000),
  quand text check (length(quand) <= 120),
  lieu text check (length(lieu) <= 120),
  photo_chemin text check (length(photo_chemin) <= 200),
  document_chemin text check (length(document_chemin) <= 200),
  epinglee boolean not null default false,
  expire_le date,
  publiee_le timestamptz not null default now()
);

comment on table public.annonce is 'Une information publiée par le conseil syndical pour les résidents, sans inscription.';
comment on column public.annonce.identifiant_public is 'Identifiant du lien public de l''annonce, tiré au hasard : il ne permet pas de deviner les autres annonces.';
comment on column public.annonce.quand is 'Ligne d''information libre : « Jeudi 12 novembre à 18h30 », « Du 2 au 20 novembre ».';
comment on column public.annonce.lieu is 'Ligne d''information libre : « Salle commune, rez-de-chaussée, bât. A ».';
comment on column public.annonce.photo_chemin is 'Chemin de la photo dans le bucket `annonces` ; `null` sans photo. Elle illustre la page publique et son aperçu, jamais la carte de la liste.';
comment on column public.annonce.document_chemin is 'Chemin du PDF joint dans le bucket `annonces` ; `null` sans document.';
comment on column public.annonce.expire_le is '`null` : n''expire pas. Sinon dernier jour où l''annonce figure dans la liste ; son lien public reste lisible.';

create index annonce_liste_idx on public.annonce (epinglee desc, publiee_le desc);

alter table public.annonce enable row level security;

revoke all on public.annonce from anon, authenticated;
grant select, delete on public.annonce to authenticated;
grant insert (type, titre, texte, quand, lieu, photo_chemin, document_chemin, epinglee, expire_le)
  on public.annonce to authenticated;
grant update (type, titre, texte, quand, lieu, photo_chemin, document_chemin, epinglee, expire_le)
  on public.annonce to authenticated;

create policy "Les comptes actifs lisent les annonces"
  on public.annonce for select
  to authenticated
  using ((select public.peut_consulter()));

create policy "Le conseil syndical publie une annonce"
  on public.annonce for insert
  to authenticated
  with check ((select public.est_syndic()));

create policy "Le conseil syndical modifie une annonce"
  on public.annonce for update
  to authenticated
  using ((select public.est_syndic()))
  with check ((select public.est_syndic()));

create policy "Le conseil syndical supprime une annonce"
  on public.annonce for delete
  to authenticated
  using ((select public.est_syndic()));

/**
 * Les annonces de la liste principale : celles qui n'ont pas expiré (le jour d'expiration
 * compris), les épinglées d'abord, puis les plus récentes. Les politiques de lecture de
 * `annonce` s'appliquent à qui appelle.
 */
create function public.annonces_du_moment()
returns setof public.annonce
language sql
stable
security invoker
set search_path = ''
as $$
  select * from public.annonce
  where expire_le is null or expire_le >= current_date
  order by epinglee desc, publiee_le desc;
$$;

revoke execute on function public.annonces_du_moment() from public, anon;
grant execute on function public.annonces_du_moment() to authenticated;

/**
 * Une annonce lisible par tous à partir de son identifiant public, expirée comprise : le lien
 * déjà partagé continue de mener quelque part. Aucun nom n'est livré.
 */
create function public.fiche_annonce(identifiant text)
returns table (
  identifiant_public text,
  type public.type_annonce,
  titre text,
  texte text,
  quand text,
  lieu text,
  photo_chemin text,
  document_chemin text,
  publiee_le timestamptz,
  expire_le date
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    a.identifiant_public, a.type, a.titre, a.texte, a.quand, a.lieu,
    a.photo_chemin, a.document_chemin, a.publiee_le, a.expire_le
  from public.annonce a
  where a.identifiant_public = identifiant;
$$;

revoke execute on function public.fiche_annonce(text) from public;
grant execute on function public.fiche_annonce(text) to anon, authenticated;

-- Photo et document PDF : un bucket public (une adresse de fichier se partage dans WhatsApp et
-- sert l'aperçu du lien), où seul le conseil syndical dépose et retire. Le bucket refuse tout ce
-- qui n'est ni une image courante ni un PDF, au-delà de 5 Mo.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'annonces',
  'annonces',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
);

create policy "Le conseil syndical dépose un fichier d'annonce"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'annonces' and (select public.est_syndic()));

create policy "Le conseil syndical retrouve les fichiers d'annonce"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'annonces' and (select public.est_syndic()));

create policy "Le conseil syndical remplace un fichier d'annonce"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'annonces' and (select public.est_syndic()))
  with check (bucket_id = 'annonces' and (select public.est_syndic()));

create policy "Le conseil syndical retire un fichier d'annonce"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'annonces' and (select public.est_syndic()));
