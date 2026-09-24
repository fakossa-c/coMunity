-- Résidents : inscription par code de résidence, validation par le syndic, droits selon le statut.

alter table public.profil
  add column prenom text check (length(trim(prenom)) between 1 and 40),
  add column batiment text check (length(trim(batiment)) between 1 and 40),
  add column etage smallint check (etage between 0 and 99),
  add constraint resident_complet check (
    role = 'syndic' or (prenom is not null and batiment is not null and etage is not null)
  );

comment on column public.profil.etage is 'Étage du logement, 0 pour le rez-de-chaussée.';

/** Forme comparable d'un code : sans casse, sans espaces ni tirets. */
create function public.normaliser_code(code text)
returns text
language sql
immutable
set search_path = ''
as $$
  select upper(regexp_replace(coalesce(code, ''), '[^[:alnum:]]', '', 'g'));
$$;

/** Vrai si `essai` est le code en vigueur. Le code lui-même reste illisible. */
create function public.code_residence_valide(essai text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.residence
    where public.normaliser_code(code) = public.normaliser_code(essai)
      and public.normaliser_code(essai) <> ''
  );
$$;

revoke execute on function public.code_residence_valide(text) from public;
grant execute on function public.code_residence_valide(text) to anon, authenticated;

-- Un compte ouvert avec un code de résidence devient un résident en attente. Le code est
-- vérifié ici, et pas seulement par la page d'inscription : l'API d'Auth est publique.
create function public.inscrire_resident()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  donnees jsonb := new.raw_user_meta_data;
begin
  if donnees is null or not donnees ? 'code_residence' then
    return new;
  end if;
  if not public.code_residence_valide(donnees ->> 'code_residence') then
    raise exception 'Code de résidence incorrect' using errcode = 'P0001';
  end if;

  insert into public.profil (id, email, role, statut, prenom, batiment, etage)
  values (
    new.id,
    new.email,
    'resident',
    'en_attente',
    trim(donnees ->> 'prenom'),
    trim(donnees ->> 'batiment'),
    (donnees ->> 'etage')::smallint
  );
  return new;
end;
$$;

revoke execute on function public.inscrire_resident() from public, anon, authenticated;

create trigger inscrire_resident
  after insert on auth.users
  for each row execute function public.inscrire_resident();

/** Vrai si la personne connectée peut consulter activités, annonces et lieux. */
create function public.peut_consulter()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profil
    where id = auth.uid()
      and (statut = 'valide' or (role = 'resident' and statut = 'en_attente'))
  );
$$;

/** Vrai si la personne connectée peut s'inscrire, créer une activité, laisser un retour. */
create function public.peut_participer()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profil
    where id = auth.uid() and statut = 'valide'
  );
$$;

revoke execute on function public.peut_consulter() from public, anon;
grant execute on function public.peut_consulter() to authenticated;
revoke execute on function public.peut_participer() from public, anon;
grant execute on function public.peut_participer() to authenticated;

/**
 * Décision du syndic sur un résident : valider ou refuser un résident en attente,
 * retirer un résident validé. Toute autre transition est refusée.
 */
create function public.statuer_resident(resident uuid, decision public.statut_compte)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.est_syndic() then
    raise exception 'Réservé aux membres du syndic' using errcode = '42501';
  end if;

  update public.profil set statut = decision
  where id = resident
    and role = 'resident'
    and (
      (statut = 'en_attente' and decision in ('valide', 'refuse'))
      or (statut = 'valide' and decision = 'retire')
    );
  if not found then
    raise exception 'Ce résident n''est plus dans l''état attendu' using errcode = 'P0002';
  end if;
end;
$$;

revoke execute on function public.statuer_resident(uuid, public.statut_compte) from public, anon;
grant execute on function public.statuer_resident(uuid, public.statut_compte) to authenticated;

/** Le code en vigueur, pour le syndic qui le partage aux résidents. */
create function public.lire_code_residence()
returns text
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.est_syndic() then
    raise exception 'Réservé aux membres du syndic' using errcode = '42501';
  end if;
  return (select code from public.residence);
end;
$$;

/**
 * Remplace le code par un nouveau, tiré au hasard : 8 caractères sans lettres ni chiffres
 * ambigus (ni I, O, 0 ou 1), par exemple K7PM-3QXR. L'ancien cesse aussitôt de fonctionner.
 */
create function public.regenerer_code_residence()
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  octets bytea := extensions.gen_random_bytes(8);
  nouveau text := '';
begin
  if not public.est_syndic() then
    raise exception 'Réservé aux membres du syndic' using errcode = '42501';
  end if;

  for i in 0..7 loop
    if i = 4 then
      nouveau := nouveau || '-';
    end if;
    -- 256 est un multiple de 32 : chaque caractère a la même chance d'être tiré.
    nouveau := nouveau || substr(alphabet, get_byte(octets, i) % 32 + 1, 1);
  end loop;

  update public.residence set code = nouveau where id;
  return nouveau;
end;
$$;

revoke execute on function public.lire_code_residence() from public, anon;
grant execute on function public.lire_code_residence() to authenticated;
revoke execute on function public.regenerer_code_residence() from public, anon;
grant execute on function public.regenerer_code_residence() to authenticated;
