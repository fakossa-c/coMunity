-- Tableau de bord du conseil syndical (ticket #17, spec #58) : ce qui anime la résidence, calculé
-- par des fonctions réservées à ses membres. Migration additive : cinq fonctions nouvelles, aucune
-- table ni colonne touchée.
--
-- Les chiffres portent sur les activités qui ont eu lieu dans la période : publiées (ni annulées,
-- ni en relecture, ni masquées) et terminées (date et heure de fin passées). Une activité à venir
-- n'a pas fini de se remplir, elle fausserait les taux.

/**
 * Les activités qui ont eu lieu entre deux dates incluses. Fonction interne des statistiques :
 * elle ne vérifie aucun droit, donc aucun rôle de l'API ne peut l'appeler.
 */
create function public.activites_tenues(p_debut date, p_fin date)
returns setof public.activite
language sql
stable
security definer
set search_path = ''
as $$
  select a.*
  from public.activite a
  where a.statut = 'publiee'
    and a.date_activite between p_debut and p_fin
    and (a.date_activite + a.heure_fin) < now();
$$;

revoke execute on function public.activites_tenues(date, date) from public, anon, authenticated;

/**
 * Les volumes de la période : activités, inscriptions, résidents différents inscrits (l'indicateur
 * principal du produit), part des activités créées par le conseil syndical ou par des résidents.
 * Les comptes validés et en attente sont ceux d'aujourd'hui, la période ne les touche pas.
 */
create function public.tableau_bord_synthese(p_debut date, p_fin date)
returns table (
  nombre_activites integer,
  nombre_inscriptions integer,
  nombre_participants integer,
  activites_par_residents integer,
  activites_par_conseil integer,
  residents_valides integer,
  residents_en_attente integer
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.est_syndic() then
    raise exception 'Le tableau de bord est réservé au conseil syndical' using errcode = '42501';
  end if;

  return query
  select
    (select count(*) from public.activites_tenues(p_debut, p_fin))::integer,
    (
      select count(*)
      from public.activites_tenues(p_debut, p_fin) t
      join public.inscription_activite i on i.activite_id = t.id
    )::integer,
    (
      select count(distinct i.resident_id)
      from public.activites_tenues(p_debut, p_fin) t
      join public.inscription_activite i on i.activite_id = t.id
    )::integer,
    (
      select count(*)
      from public.activites_tenues(p_debut, p_fin) t
      join public.profil p on p.id = t.organisateur
      where p.role <> 'syndic'
    )::integer,
    (
      select count(*)
      from public.activites_tenues(p_debut, p_fin) t
      join public.profil p on p.id = t.organisateur
      where p.role = 'syndic'
    )::integer,
    (select count(*) from public.profil where role = 'resident' and statut = 'valide')::integer,
    (select count(*) from public.profil where role = 'resident' and statut = 'en_attente')::integer;
end;
$$;

revoke execute on function public.tableau_bord_synthese(date, date) from public, anon;
grant execute on function public.tableau_bord_synthese(date, date) to authenticated;

/**
 * Le nombre d'activités et le taux de remplissage moyen par catégorie (`categorie`), par jour de
 * la semaine (`jour`, de 1 pour lundi à 7 pour dimanche) et par tranche horaire de début
 * (`creneau` : `matin` avant 12h, `apres_midi` avant 18h, `soir` ensuite). Le taux est la moyenne,
 * en pourcentage, du rapport places prises sur capacité de chaque activité ; une activité sans
 * capacité n'a pas de taux, et un groupe qui n'en a aucune rend `null`. Une ligne par groupe qui a
 * au moins une activité.
 */
create function public.tableau_bord_remplissage(p_debut date, p_fin date)
returns table (
  dimension text,
  cle text,
  nombre_activites integer,
  taux_remplissage numeric
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.est_syndic() then
    raise exception 'Le tableau de bord est réservé au conseil syndical' using errcode = '42501';
  end if;

  return query
  with taux as (
    select
      t.categorie as categorie_activite,
      t.date_activite as jour_activite,
      t.heure_debut as debut_activite,
      case
        when t.capacite_max is not null
          then least(100, public.places_prises(t.id) * 100.0 / t.capacite_max)
      end as pourcentage
    from public.activites_tenues(p_debut, p_fin) t
  ),
  groupes as (
    select 'categorie'::text as axe, x.categorie_activite::text as valeur, x.pourcentage from taux x
    union all
    select 'jour', extract(isodow from x.jour_activite)::integer::text, x.pourcentage from taux x
    union all
    select
      'creneau',
      case
        when x.debut_activite < time '12:00' then 'matin'
        when x.debut_activite < time '18:00' then 'apres_midi'
        else 'soir'
      end,
      x.pourcentage
    from taux x
  )
  select g.axe, g.valeur, count(*)::integer, round(avg(g.pourcentage), 1)
  from groupes g
  group by g.axe, g.valeur
  order by g.axe, g.valeur;
end;
$$;

revoke execute on function public.tableau_bord_remplissage(date, date) from public, anon;
grant execute on function public.tableau_bord_remplissage(date, date) to authenticated;

/**
 * Les activités de la période qui ont reçu au moins un retour, de la mieux notée à la moins bien
 * notée (à note égale : le plus de retours, puis la plus récente), avec leurs commentaires du plus
 * récent au plus ancien. Les commentaires n'ont pas d'auteur, comme dans `retours_activite`.
 */
create function public.tableau_bord_classement(p_debut date, p_fin date, p_limite integer default 10)
returns table (
  identifiant_public text,
  titre text,
  categorie public.categorie_activite,
  date_activite date,
  note_moyenne numeric,
  nombre_retours integer,
  places_prises integer,
  commentaires jsonb
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.est_syndic() then
    raise exception 'Le tableau de bord est réservé au conseil syndical' using errcode = '42501';
  end if;

  return query
  select
    t.identifiant_public,
    t.titre,
    t.categorie,
    t.date_activite,
    round(avg(r.note), 1),
    count(r.id)::integer,
    public.places_prises(t.id),
    jsonb_agg(
      jsonb_build_object('note', r.note, 'commentaire', r.commentaire)
      order by r.laisse_le desc
    )
  from public.activites_tenues(p_debut, p_fin) t
  join public.retour r on r.activite_id = t.id
  group by t.id, t.identifiant_public, t.titre, t.categorie, t.date_activite
  order by avg(r.note) desc, count(r.id) desc, t.date_activite desc
  limit greatest(coalesce(p_limite, 10), 0);
end;
$$;

revoke execute on function public.tableau_bord_classement(date, date, integer) from public, anon;
grant execute on function public.tableau_bord_classement(date, date, integer) to authenticated;

/**
 * Une ligne par mois de la période, mois sans activité compris : le nombre d'activités et de
 * résidents différents inscrits, la courbe de l'indicateur principal. `mois` est le premier jour
 * du mois.
 */
create function public.tableau_bord_par_mois(p_debut date, p_fin date)
returns table (
  mois date,
  nombre_activites integer,
  nombre_participants integer
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.est_syndic() then
    raise exception 'Le tableau de bord est réservé au conseil syndical' using errcode = '42501';
  end if;

  return query
  select
    m.debut_mois,
    (
      select count(*)
      from public.activites_tenues(p_debut, p_fin) t
      where date_trunc('month', t.date_activite)::date = m.debut_mois
    )::integer,
    (
      select count(distinct i.resident_id)
      from public.activites_tenues(p_debut, p_fin) t
      join public.inscription_activite i on i.activite_id = t.id
      where date_trunc('month', t.date_activite)::date = m.debut_mois
    )::integer
  from (
    select generate_series(
      date_trunc('month', p_debut)::date,
      date_trunc('month', p_fin)::date,
      interval '1 month'
    )::date as debut_mois
  ) m
  order by m.debut_mois;
end;
$$;

revoke execute on function public.tableau_bord_par_mois(date, date) from public, anon;
grant execute on function public.tableau_bord_par_mois(date, date) to authenticated;
