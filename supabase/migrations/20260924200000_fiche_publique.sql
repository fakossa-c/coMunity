-- Fiche publique d'une activité : un identifiant court pour le lien partagé, et une lecture
-- ouverte aux visiteurs qui ne livre aucun nom.

/** Douze caractères en minuscules et chiffres, sans les caractères qu'on confond (0, o, 1, l, i). */
create function public.nouvel_identifiant_public()
returns text
language plpgsql
volatile
set search_path = ''
as $$
declare
  alphabet constant text := '23456789abcdefghjkmnpqrstuvwxyz';
  octets bytea := extensions.gen_random_bytes(12);
  resultat text := '';
begin
  for i in 0..11 loop
    resultat := resultat || substr(alphabet, 1 + get_byte(octets, i) % length(alphabet), 1);
  end loop;
  return resultat;
end;
$$;

-- Valeur par défaut de la colonne : l'insertion l'exécute avec les droits de qui publie.
revoke execute on function public.nouvel_identifiant_public() from public, anon;
grant execute on function public.nouvel_identifiant_public() to authenticated;

alter table public.activite
  add column identifiant_public text not null unique
    default public.nouvel_identifiant_public()
    check (identifiant_public ~ '^[a-z0-9]{12}$');

comment on column public.activite.identifiant_public is 'Identifiant du lien public de la fiche, tiré au hasard : il ne permet pas de deviner les autres activités.';

/**
 * La fiche d'une activité, lisible par tous à partir de son identifiant public. Un visiteur n'y lit
 * aucun nom : le prénom de l'organisateur n'est donné qu'aux comptes qui consultent la résidence.
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
  organisateur_prenom text,
  est_organisateur boolean
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
    case when public.peut_consulter() then p.prenom end,
    a.organisateur is not distinct from auth.uid()
  from public.activite a
  join public.profil p on p.id = a.organisateur
  where a.identifiant_public = identifiant;
$$;

revoke execute on function public.fiche_activite(text) from public;
grant execute on function public.fiche_activite(text) to anon, authenticated;
