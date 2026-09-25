-- Décision du 24/09/2026 : un membre du syndic est un résident avec des droits en plus. Il a un
-- prénom et un nom comme tout compte. `peut_consulter` et `peut_participer` ne regardent que le
-- statut : un membre du syndic validé a déjà les droits d'un résident validé.

-- La contrainte `resident_complet` laisse un membre du syndic sans prénom ni nom : le collègue
-- invité, dont le profil naît de l'email d'invitation, les saisit en choisissant son mot de
-- passe ; le script d'amorçage les exige ; un compte plus ancien les complète à sa connexion.
comment on column public.profil.prenom is 'Obligatoire. Vide seulement pour un membre du syndic qui ne l''a pas encore saisi.';
comment on column public.profil.nom is 'Obligatoire. Vide seulement pour un membre du syndic qui ne l''a pas encore saisi.';

/**
 * Enregistre le prénom et le nom de la personne connectée, s'il lui en manque un : membre du
 * syndic amorcé avant qu'ils soient demandés, ou collègue invité. Ne remplace pas un nom saisi.
 */
create function public.completer_profil(prenom text, nom text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  prenom_saisi text := nullif(trim(prenom), '');
  nom_saisi text := nullif(trim(nom), '');
begin
  if prenom_saisi is null or nom_saisi is null then
    raise exception 'Le prénom et le nom sont obligatoires' using errcode = '23514';
  end if;

  update public.profil as p
  set prenom = prenom_saisi, nom = nom_saisi
  where p.id = auth.uid() and (p.prenom is null or p.nom is null);
  if not found then
    raise exception 'Aucun profil à compléter' using errcode = 'P0002';
  end if;
end;
$$;

revoke execute on function public.completer_profil(text, text) from public, anon;
grant execute on function public.completer_profil(text, text) to authenticated;
