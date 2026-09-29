-- Sondages du conseil syndical (ticket #39, spec #58). Un sondage est joint à une annonce : une
-- question, de 2 à 6 options à choix unique et une date limite. Il ne se modifie pas une fois
-- publié : des réponses données à une autre question n'auraient plus de sens. Un résident validé
-- répond une fois, avant la date limite (incluse). Ses résultats ne se lisent qu'après sa réponse
-- ou après la date limite, et par le conseil syndical à tout moment. Cette migration ajoute des
-- tables et des fonctions, rien n'est retiré : le code de `main` n'en est pas affecté.

/** Vrai pour de 2 à 6 options, chacune de 1 à 100 caractères. */
create function public.options_sondage_valides(p_options text[])
returns boolean
language sql
immutable
set search_path = ''
as $$
  select array_ndims(p_options) = 1
    and cardinality(p_options) between 2 and 6
    and not exists (
      select 1 from unnest(p_options) as libelle
      where libelle is null or length(trim(libelle)) not between 1 and 100
    );
$$;

create table public.sondage (
  id uuid primary key default gen_random_uuid(),
  annonce_id uuid not null unique references public.annonce (id) on delete cascade,
  question text not null check (length(trim(question)) between 1 and 200),
  options text[] not null check (public.options_sondage_valides(options)),
  echeance date not null
);

comment on table public.sondage is 'Le sondage à choix unique joint à une annonce. Une annonce en a au plus un ; il disparaît avec elle.';
comment on column public.sondage.options is 'Les options dans l''ordre d''affichage ; le choix d''une réponse est le rang de l''option, à partir de 1.';
comment on column public.sondage.echeance is 'Dernier jour où l''on peut répondre, ce jour compris. Le lendemain, les résultats sont lisibles par tous les comptes qui peuvent consulter.';

/**
 * Un sondage ne se joint qu'à une annonce de type sondage, et cette annonce garde son type tant
 * qu'elle porte un sondage : sans quoi la liste, qui montre les sondages des seules annonces de
 * type sondage, ne le montrerait plus.
 */
create function public.exiger_annonce_de_sondage()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.annonce where id = new.annonce_id and type = 'sondage'
  ) then
    raise exception 'Un sondage se joint à une annonce de type sondage' using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger sondage_sur_annonce_de_sondage
  before insert on public.sondage
  for each row execute function public.exiger_annonce_de_sondage();

create function public.garder_type_annonce_de_sondage()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.type is distinct from old.type
    and exists (select 1 from public.sondage where annonce_id = old.id) then
    raise exception 'Une annonce qui porte un sondage garde son type' using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger annonce_avec_sondage_garde_son_type
  before update of type on public.annonce
  for each row execute function public.garder_type_annonce_de_sondage();

alter table public.sondage enable row level security;

revoke all on public.sondage from anon, authenticated;
grant select on public.sondage to authenticated;
grant insert (annonce_id, question, options, echeance) on public.sondage to authenticated;

create policy "Les comptes actifs lisent les sondages"
  on public.sondage for select
  to authenticated
  using ((select public.peut_consulter()));

create policy "Le conseil syndical joint un sondage à une annonce"
  on public.sondage for insert
  to authenticated
  with check ((select public.est_syndic()) and echeance >= current_date);

create table public.reponse_sondage (
  sondage_id uuid not null references public.sondage (id) on delete cascade,
  profil_id uuid not null references public.profil (id) on delete cascade,
  choix smallint not null check (choix between 1 and 6),
  repondue_le timestamptz not null default now(),
  primary key (sondage_id, profil_id)
);

comment on table public.reponse_sondage is 'La réponse d''une personne à un sondage, unique et définitive. Personne ne la lit que son auteur : les résultats se lisent agrégés, par resultats_sondages.';

alter table public.reponse_sondage enable row level security;

revoke all on public.reponse_sondage from anon, authenticated;
grant select on public.reponse_sondage to authenticated;

create policy "Chacun lit sa propre réponse"
  on public.reponse_sondage for select
  to authenticated
  using (profil_id = (select auth.uid()));

-- Personne n'écrit directement dans les réponses : `repondre_sondage` vérifie le statut de la
-- personne, la date limite et le choix.

/**
 * Enregistre la réponse de la personne connectée au sondage `p_sondage` : `p_choix` est le rang
 * de l'option choisie, à partir de 1. Refuse un compte qui ne peut pas participer (42501), une
 * date limite passée ou un choix qui n'est pas une option (23514) ; une seconde réponse échoue
 * sur la clé de la table (23505).
 */
create function public.repondre_sondage(p_sondage uuid, p_choix integer)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  echeance_sondage date;
  nombre_options integer;
begin
  if not public.peut_participer() then
    raise exception 'Seul un résident validé peut répondre à un sondage' using errcode = '42501';
  end if;

  select echeance, cardinality(options) into echeance_sondage, nombre_options
  from public.sondage
  where id = p_sondage;
  if not found then
    raise exception 'Sondage introuvable' using errcode = 'P0002';
  end if;
  if echeance_sondage < current_date then
    raise exception 'La date limite du sondage est passée' using errcode = '23514';
  end if;
  if p_choix is null or p_choix < 1 or p_choix > nombre_options then
    raise exception 'Ce choix n''est pas une option du sondage' using errcode = '23514';
  end if;

  insert into public.reponse_sondage (sondage_id, profil_id, choix)
  values (p_sondage, (select auth.uid()), p_choix);
end;
$$;

revoke execute on function public.repondre_sondage(uuid, integer) from public, anon;
grant execute on function public.repondre_sondage(uuid, integer) to authenticated;

/**
 * Les résultats des sondages demandés : une ligne par option, avec son nombre de votes (zéro
 * compris). Un sondage n'est livré que si la personne connectée peut consulter, et que soit elle
 * est du conseil syndical, soit la date limite est passée, soit elle a déjà répondu : sinon rien.
 */
create function public.resultats_sondages(p_sondages uuid[])
returns table (sondage_id uuid, choix integer, votes integer)
language sql
stable
security definer
set search_path = ''
as $$
  select s.id, o.choix, count(r.profil_id)::integer
  from public.sondage s
  cross join lateral generate_series(1, cardinality(s.options)) as o (choix)
  left join public.reponse_sondage r on r.sondage_id = s.id and r.choix = o.choix
  where s.id = any (p_sondages)
    and public.peut_consulter()
    and (
      public.est_syndic()
      or s.echeance < current_date
      or exists (
        select 1 from public.reponse_sondage moi
        where moi.sondage_id = s.id and moi.profil_id = (select auth.uid())
      )
    )
  group by s.id, o.choix
  order by s.id, o.choix;
$$;

revoke execute on function public.resultats_sondages(uuid[]) from public, anon;
grant execute on function public.resultats_sondages(uuid[]) to authenticated;
