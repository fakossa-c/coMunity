-- Profils et comptes du syndic : rôle, invitation d'un collègue, retrait d'un accès.

create type public.role as enum ('syndic', 'resident');
create type public.statut_compte as enum ('en_attente', 'valide', 'refuse', 'retire');

create table public.profil (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  role public.role not null,
  statut public.statut_compte not null,
  cree_le timestamptz not null default now()
);

comment on table public.profil is 'Un compte de la plateforme : son rôle et son statut. Un compte sans profil n''a accès à rien.';
comment on column public.profil.statut is 'Syndic : valide ou retire. Résident : en_attente, valide, refuse ou retire.';

alter table public.profil enable row level security;

-- Personne ne modifie un profil directement : les changements de rôle et de statut
-- passent par des fonctions qui vérifient les droits.
revoke all on public.profil from anon, authenticated;
grant select on public.profil to authenticated;

/** Vrai si la personne connectée est un membre actif du syndic. */
create function public.est_syndic()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profil
    where id = auth.uid() and role = 'syndic' and statut = 'valide'
  );
$$;

revoke execute on function public.est_syndic() from public, anon;
grant execute on function public.est_syndic() to authenticated;

create policy "Chacun lit son profil, le syndic les lit tous"
  on public.profil for select
  to authenticated
  using (id = (select auth.uid()) or (select public.est_syndic()));

-- Invitation d'un collègue : le membre du syndic l'enregistre, puis le serveur envoie l'email.
-- Le compte créé par cet email reçoit le rôle syndic ; aucun autre compte ne le peut.
create table public.invitation_syndic (
  email text primary key check (email = lower(trim(email)) and email like '%@%'),
  invite_par uuid not null default auth.uid() references public.profil (id) on delete cascade,
  cree_le timestamptz not null default now()
);

comment on table public.invitation_syndic is 'Invitations envoyées par le syndic et pas encore reçues.';

alter table public.invitation_syndic enable row level security;

revoke all on public.invitation_syndic from anon, authenticated;
grant select, insert (email), delete on public.invitation_syndic to authenticated;

create policy "Le syndic lit les invitations"
  on public.invitation_syndic for select
  to authenticated
  using ((select public.est_syndic()));

create policy "Le syndic invite"
  on public.invitation_syndic for insert
  to authenticated
  with check ((select public.est_syndic()) and invite_par = (select auth.uid()));

create policy "Le syndic annule une invitation"
  on public.invitation_syndic for delete
  to authenticated
  using ((select public.est_syndic()));

-- Seul l'email d'invitation (envoyé avec la clé secrète) renseigne `invited_at` :
-- un compte ouvert librement avec la même adresse ne devient pas syndic.
create function public.accueillir_membre_invite()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.invited_at is not null then
    delete from public.invitation_syndic where email = lower(new.email);
    if found then
      insert into public.profil (id, email, role, statut)
      values (new.id, new.email, 'syndic', 'valide')
      on conflict (id) do nothing;
    end if;
  end if;
  return new;
end;
$$;

revoke execute on function public.accueillir_membre_invite() from public, anon, authenticated;

create trigger accueillir_membre_invite
  after insert or update of invited_at on auth.users
  for each row execute function public.accueillir_membre_invite();

/** Retire l'accès d'un collègue. Un membre ne peut pas retirer le sien. */
create function public.retirer_membre_syndic(membre uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.est_syndic() then
    raise exception 'Réservé aux membres du syndic' using errcode = '42501';
  end if;
  if membre = auth.uid() then
    raise exception 'Vous ne pouvez pas retirer votre propre accès' using errcode = 'P0001';
  end if;

  update public.profil set statut = 'retire'
  where id = membre and role = 'syndic' and statut = 'valide';
  if not found then
    raise exception 'Ce membre du syndic est introuvable' using errcode = 'P0002';
  end if;
end;
$$;

revoke execute on function public.retirer_membre_syndic(uuid) from public, anon;
grant execute on function public.retirer_membre_syndic(uuid) to authenticated;
