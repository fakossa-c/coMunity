-- Décision du 23/09/2026 : un résident s'inscrit avec son prénom et son nom, sans code de
-- résidence, ni bâtiment, ni étage. La validation par le syndic est le seul filtre.

drop function public.regenerer_code_residence();
drop function public.lire_code_residence();
drop function public.code_residence_valide(text);
drop function public.normaliser_code(text);

alter table public.residence drop column code;

alter table public.profil
  drop constraint resident_complet,
  drop column batiment,
  drop column etage,
  add column nom text check (length(trim(nom)) between 1 and 40),
  add constraint resident_complet check (
    role = 'syndic' or (prenom is not null and nom is not null)
  );

-- Un compte ouvert avec un prénom ou un nom devient un résident en attente ; sans l'un ni
-- l'autre, il n'a pas de profil, donc aucun accès. La contrainte `resident_complet` refuse
-- un prénom ou un nom manquant, ce qui fait échouer la création du compte.
create or replace function public.inscrire_resident()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  donnees jsonb := coalesce(new.raw_user_meta_data, '{}');
begin
  if not (donnees ? 'prenom' or donnees ? 'nom') then
    return new;
  end if;

  insert into public.profil (id, email, role, statut, prenom, nom)
  values (
    new.id,
    new.email,
    'resident',
    'en_attente',
    nullif(trim(donnees ->> 'prenom'), ''),
    nullif(trim(donnees ->> 'nom'), '')
  );
  return new;
end;
$$;
