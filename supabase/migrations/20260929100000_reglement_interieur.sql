-- Règlement intérieur de la résidence (ticket #43, spec #53). Le conseil syndical le rédige section
-- par section ; les résidents validés ou en attente et le conseil syndical le lisent, personne
-- d'autre. Le texte d'une section est une mise en forme simple (paragraphes, tirets, gras) que
-- l'application rend sans jamais l'interpréter comme du HTML : la base ne garde que le texte brut.

create table public.section_reglement (
  id uuid primary key default gen_random_uuid(),
  titre text not null check (length(trim(titre)) between 1 and 100),
  texte text not null check (length(trim(texte)) > 0 and length(texte) <= 5000),
  position integer not null,
  cree_le timestamptz not null default now()
);

comment on table public.section_reglement is 'Une section du règlement intérieur : un titre, et un texte qui se déplie.';
comment on column public.section_reglement.texte is 'Texte brut à mise en forme simple : paragraphes séparés par une ligne vide, lignes commençant par « - » en liste à puces, **gras**.';
comment on column public.section_reglement.position is 'Rang de la section dans le règlement, donné par la base à la création et changé par `deplacer_section_reglement`. Deux sections peuvent le partager : `cree_le` les départage.';

create index section_reglement_position_idx on public.section_reglement (position, cree_le);

alter table public.section_reglement enable row level security;

-- La position ne se choisit pas : elle se donne à la création et se change par la fonction de
-- déplacement.
revoke all on public.section_reglement from anon, authenticated;
grant select, delete on public.section_reglement to authenticated;
grant insert (titre, texte) on public.section_reglement to authenticated;
grant update (titre, texte) on public.section_reglement to authenticated;

create policy "Les comptes actifs lisent le règlement intérieur"
  on public.section_reglement for select
  to authenticated
  using ((select public.peut_consulter()));

create policy "Le conseil syndical crée une section du règlement"
  on public.section_reglement for insert
  to authenticated
  with check ((select public.est_syndic()));

create policy "Le conseil syndical modifie une section du règlement"
  on public.section_reglement for update
  to authenticated
  using ((select public.est_syndic()))
  with check ((select public.est_syndic()));

create policy "Le conseil syndical supprime une section du règlement"
  on public.section_reglement for delete
  to authenticated
  using ((select public.est_syndic()));

/** Une nouvelle section prend la dernière place. */
create function public.placer_section_reglement()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  select coalesce(max(position), 0) + 1 into new.position from public.section_reglement;
  return new;
end;
$$;

revoke execute on function public.placer_section_reglement() from public, anon, authenticated;

create trigger section_reglement_place
  before insert on public.section_reglement
  for each row
  execute function public.placer_section_reglement();

-- La date de dernière mise à jour du règlement : une seule ligne, tenue par la base à chaque
-- création, modification, déplacement ou suppression d'une section (une suppression ne peut pas
-- se lire dans les dates des sections restantes). Le déclencheur agit par ligne : une écriture que
-- la RLS écarte, ou qui ne touche aucune ligne, ne change pas la date.
create table public.reglement (
  id boolean primary key default true check (id),
  mis_a_jour_le timestamptz not null default now()
);

comment on table public.reglement is 'Date de dernière mise à jour du règlement intérieur (ligne unique, absente tant qu''aucune section n''a été écrite).';

alter table public.reglement enable row level security;

revoke all on public.reglement from anon, authenticated;
grant select on public.reglement to authenticated;

create policy "Les comptes actifs lisent la date du règlement intérieur"
  on public.reglement for select
  to authenticated
  using ((select public.peut_consulter()));

create function public.dater_reglement()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.reglement (id, mis_a_jour_le) values (true, now())
  on conflict (id) do update set mis_a_jour_le = excluded.mis_a_jour_le;
  return null;
end;
$$;

revoke execute on function public.dater_reglement() from public, anon, authenticated;

create trigger section_reglement_datee
  after insert or update or delete on public.section_reglement
  for each row
  execute function public.dater_reglement();

/**
 * Échange une section avec sa voisine du dessus (`vers_le_haut`) ou du dessous. Sans voisine,
 * ne fait rien. Renumérote toutes les sections de 1 à n : les positions restent denses même
 * après des suppressions. Réservé au conseil syndical.
 */
create function public.deplacer_section_reglement(section uuid, vers_le_haut boolean)
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
    raise exception 'Seuls les membres du conseil syndical ordonnent le règlement intérieur'
      using errcode = '42501';
  end if;

  -- Deux déplacements simultanés se suivent au lieu de se mélanger.
  perform 1 from public.section_reglement for update;

  select array_agg(id order by position, cree_le, id) into ordre from public.section_reglement;
  rang := array_position(ordre, section);
  if rang is null then
    raise exception 'Section du règlement introuvable' using errcode = '22023';
  end if;

  voisin := case when vers_le_haut then rang - 1 else rang + 1 end;
  if voisin < 1 or voisin > cardinality(ordre) then
    return;
  end if;

  ordre[rang] := ordre[voisin];
  ordre[voisin] := section;

  update public.section_reglement s
  set position = r.rang
  from unnest(ordre) with ordinality as r (id, rang)
  where s.id = r.id;
end;
$$;

revoke execute on function public.deplacer_section_reglement(uuid, boolean) from public, anon;
grant execute on function public.deplacer_section_reglement(uuid, boolean) to authenticated;
