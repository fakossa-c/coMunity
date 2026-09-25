-- Décision du 25/09/2026 : partout où un résident en voit un autre, il lit son prénom et l'initiale
-- de son nom (« Danielle M. »), membre du syndic compris. La fiche d'activité ne dit plus qu'une
-- activité vient du syndic ; `proposee_par_syndic` reste livré, pour que la base le sache.

/** « Danielle M. » : ce qu'un résident lit d'un autre. Vide si le prénom ou le nom manque. */
create function public.nom_affiche(prenom text, nom text)
returns text
language sql
immutable
set search_path = ''
as $$
  select prenom || ' ' || upper(left(nom, 1)) || '.';
$$;

revoke execute on function public.nom_affiche(text, text) from public, anon;
grant execute on function public.nom_affiche(text, text) to authenticated;

-- Une colonne de retour change : la fonction se recrée.
drop function public.fiche_activite(text);

/**
 * La fiche d'une activité, lisible par tous à partir de son identifiant public. Un visiteur n'y lit
 * aucun nom : le nom affiché de l'organisateur n'est donné qu'aux comptes qui consultent la résidence.
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
  organisateur_nom_affiche text,
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
    case when public.peut_consulter() then public.nom_affiche(p.prenom, p.nom) end,
    a.organisateur is not distinct from auth.uid()
  from public.activite a
  join public.profil p on p.id = a.organisateur
  where a.identifiant_public = identifiant;
$$;

revoke execute on function public.fiche_activite(text) from public;
grant execute on function public.fiche_activite(text) to anon, authenticated;
