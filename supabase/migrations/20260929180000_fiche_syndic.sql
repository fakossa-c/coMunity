-- Mon syndic (ticket #42, spec #1) : les fiches des personnes du syndic, que le conseil syndical
-- tient et que les résidents validés ou en attente lisent, personne d'autre. Une fiche est
-- indépendante des comptes : une personne sans compte a la sienne, un compte syndic sans fiche
-- n'apparaît pas. Une fiche peut être reliée à un compte syndic actif, ce qui vaut la mention
-- « Sur coMunity ». Migration additive : une table, un bucket, des fonctions nouvelles.

create table public.fiche_syndic (
  id uuid primary key default gen_random_uuid(),
  prenom text not null check (length(trim(prenom)) between 1 and 50),
  nom text not null check (length(trim(nom)) between 1 and 50),
  telephone text check (length(trim(telephone)) between 1 and 30),
  email text check (length(email) <= 254 and email ~ '^[^\s@]+@[^\s@]+\.[^\s@]+$'),
  photo_chemin text check (
    photo_chemin ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.jpg$'
  ),
  compte_id uuid references public.profil (id) on delete set null,
  position integer not null,
  cree_le timestamptz not null default now()
);

comment on table public.fiche_syndic is 'Une personne du syndic présentée aux résidents dans Mon syndic. Indépendante des comptes : elle existe sans compte.';
comment on column public.fiche_syndic.photo_chemin is 'Chemin de la photo dans le bucket privé `syndic` ; `null` sans photo (l''initiale la remplace).';
comment on column public.fiche_syndic.compte_id is 'Le compte syndic de cette personne dans l''app, s''il existe. La mention « Sur coMunity » ne s''affiche que si ce compte est encore actif (`lister_fiches_syndic`). Devient `null` si le compte est supprimé : la fiche reste.';
comment on column public.fiche_syndic.position is 'Rang de la fiche dans Mon syndic, donné par la base à la création et changé par `deplacer_fiche_syndic`. Deux fiches peuvent le partager : `cree_le` les départage.';

create unique index fiche_syndic_compte_idx on public.fiche_syndic (compte_id)
  where compte_id is not null;
create index fiche_syndic_position_idx on public.fiche_syndic (position, cree_le);

alter table public.fiche_syndic enable row level security;

-- La position ne se choisit pas : elle se donne à la création et se change par la fonction de
-- déplacement. Les résidents lisent par `lister_fiches_syndic`, jamais dans la table.
revoke all on public.fiche_syndic from anon, authenticated;
grant select, delete on public.fiche_syndic to authenticated;
grant insert (prenom, nom, telephone, email, photo_chemin, compte_id)
  on public.fiche_syndic to authenticated;
grant update (prenom, nom, telephone, email, photo_chemin, compte_id)
  on public.fiche_syndic to authenticated;

create policy "Le conseil syndical lit les fiches du syndic"
  on public.fiche_syndic for select
  to authenticated
  using ((select public.est_syndic()));

create policy "Le conseil syndical crée une fiche du syndic"
  on public.fiche_syndic for insert
  to authenticated
  with check ((select public.est_syndic()));

create policy "Le conseil syndical modifie une fiche du syndic"
  on public.fiche_syndic for update
  to authenticated
  using ((select public.est_syndic()))
  with check ((select public.est_syndic()));

create policy "Le conseil syndical supprime une fiche du syndic"
  on public.fiche_syndic for delete
  to authenticated
  using ((select public.est_syndic()));

/** Une nouvelle fiche prend la dernière place. */
create function public.placer_fiche_syndic()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  select coalesce(max(position), 0) + 1 into new.position from public.fiche_syndic;
  return new;
end;
$$;

revoke execute on function public.placer_fiche_syndic() from public, anon, authenticated;

create trigger fiche_syndic_place
  before insert on public.fiche_syndic
  for each row
  execute function public.placer_fiche_syndic();

/**
 * Une fiche ne se relie qu'à un compte syndic actif. Le contrôle ne vaut qu'au moment de relier :
 * une fiche dont le compte a perdu son accès depuis reste modifiable (sans mention « Sur coMunity »).
 */
create function public.verifier_compte_fiche_syndic()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' and new.compte_id is not distinct from old.compte_id then
    return new;
  end if;
  if not exists (
    select 1 from public.profil
    where id = new.compte_id and role = 'syndic' and statut = 'valide'
  ) then
    raise exception 'Une fiche ne se relie qu''à un compte syndic actif' using errcode = '22023';
  end if;
  return new;
end;
$$;

revoke execute on function public.verifier_compte_fiche_syndic() from public, anon, authenticated;

create trigger fiche_syndic_compte_verifie
  before insert or update of compte_id on public.fiche_syndic
  for each row
  when (new.compte_id is not null)
  execute function public.verifier_compte_fiche_syndic();

/**
 * Les fiches de Mon syndic dans leur ordre, pour les résidents validés ou en attente et le conseil
 * syndical (vide pour tout autre). `sur_comunity` est vrai quand la fiche est reliée à un compte
 * syndic encore actif ; le compte relié lui-même n'est donné qu'au conseil syndical.
 */
create function public.lister_fiches_syndic()
returns table (
  id uuid,
  prenom text,
  nom text,
  telephone text,
  email text,
  photo_chemin text,
  compte_id uuid,
  sur_comunity boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    f.id,
    f.prenom,
    f.nom,
    f.telephone,
    f.email,
    f.photo_chemin,
    case when public.est_syndic() then f.compte_id end,
    exists (
      select 1 from public.profil p
      where p.id = f.compte_id and p.role = 'syndic' and p.statut = 'valide'
    )
  from public.fiche_syndic f
  where public.peut_consulter()
  order by f.position, f.cree_le, f.id;
$$;

revoke execute on function public.lister_fiches_syndic() from public, anon;
grant execute on function public.lister_fiches_syndic() to authenticated;

/**
 * Échange une fiche avec sa voisine du dessus (`vers_le_haut`) ou du dessous. Sans voisine,
 * ne fait rien. Renumérote toutes les fiches de 1 à n : les positions restent denses même après
 * des suppressions. Réservé au conseil syndical.
 */
create function public.deplacer_fiche_syndic(fiche uuid, vers_le_haut boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  ordre uuid[];
  rang integer;
  voisin integer;
begin
  if not public.est_syndic() then
    raise exception 'Seuls les membres du conseil syndical ordonnent les fiches de Mon syndic'
      using errcode = '42501';
  end if;

  -- Deux déplacements simultanés se suivent au lieu de se mélanger.
  perform 1 from public.fiche_syndic for update;

  select array_agg(id order by position, cree_le, id) into ordre from public.fiche_syndic;
  rang := array_position(ordre, fiche);
  if rang is null then
    raise exception 'Fiche du syndic introuvable' using errcode = '22023';
  end if;

  voisin := case when vers_le_haut then rang - 1 else rang + 1 end;
  if voisin < 1 or voisin > cardinality(ordre) then
    return;
  end if;

  ordre[rang] := ordre[voisin];
  ordre[voisin] := fiche;

  update public.fiche_syndic f
  set position = r.rang
  from unnest(ordre) with ordinality as r (id, rang)
  where f.id = r.id;
end;
$$;

revoke execute on function public.deplacer_fiche_syndic(uuid, boolean) from public, anon;
grant execute on function public.deplacer_fiche_syndic(uuid, boolean) to authenticated;

-- Photo : un bucket privé, le visage d'une personne n'est pas fait pour être partagé hors de la
-- résidence. Les comptes qui peuvent lire Mon syndic reçoivent des adresses signées ; seul le
-- conseil syndical dépose et retire. La compression du navigateur ne produit que du JPEG, d'au
-- plus quelques centaines de Ko : le bucket refuse tout le reste, et au-delà de 2 Mo. Une photo
-- s'appelle `<identifiant>.jpg` et ne se remplace pas : on en dépose une autre.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('syndic', 'syndic', false, 2097152, array['image/jpeg']);

create policy "Les comptes actifs lisent les photos du syndic"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'syndic' and (select public.peut_consulter()));

create policy "Le conseil syndical dépose une photo du syndic"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'syndic'
    and name ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.jpg$'
    and (select public.est_syndic())
  );

create policy "Le conseil syndical retire une photo du syndic"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'syndic' and (select public.est_syndic()));
