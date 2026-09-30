-- Jour de référence en Europe/Paris (ticket #86) : la base compare les activités au jour et à
-- l'heure de la résidence, pas à ceux d'UTC, et une activité du jour quitte « à venir » à son
-- heure de fin. Migration additive : deux fonctions nouvelles, une colonne `heure_fin` en plus
-- dans le catalogue et dans les activités organisées, `activite_est_passee` recomparée à l'heure
-- de Paris. Aucune table, colonne ni fonction n'est retirée ; le code de `main` lit les listes
-- par nom de champ et ignore la colonne en plus.

/** L'heure murale de la résidence à cet instant : la référence de toutes les échéances d'activité. */
create function public.maintenant_reference()
returns timestamp
language sql
stable
set search_path = ''
as $$
  select now() at time zone 'Europe/Paris';
$$;

/** Le jour de la résidence : « aujourd'hui » pour toute l'application, la nuit comprise. */
create function public.jour_reference()
returns date
language sql
stable
set search_path = ''
as $$
  select (public.maintenant_reference())::date;
$$;

-- Fonctions internes, appelées par les fonctions `security definer` ci-dessous : aucun rôle de
-- l'API n'a à les appeler.
revoke execute on function public.maintenant_reference() from public, anon, authenticated;
revoke execute on function public.jour_reference() from public, anon, authenticated;

/** Vrai si l'activité désignée par son id interne est terminée (date et heure de fin passées à Paris). */
create or replace function public.activite_est_passee(p_activite uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (a.date_activite + a.heure_fin) < public.maintenant_reference()
  from public.activite a
  where a.id = p_activite;
$$;

-- Le catalogue ne garde que les activités pas encore terminées, et donne leur heure de fin.
drop function public.catalogue_activites();

/**
 * Les activités à venir, comme le catalogue de l'accueil : celles dont l'heure de fin n'est pas
 * passée à Paris, le jour même compris. Avec l'inscription de la personne connectée, les
 * étiquettes, le statut, la première photo et l'heure de fin de chaque activité. Une activité
 * annulée n'y figure que pour ses inscrits et son créateur ; une activité en relecture ou masquée,
 * que pour son créateur.
 */
create function public.catalogue_activites()
returns table (
  id uuid,
  identifiant_public text,
  titre text,
  categorie public.categorie_activite,
  pictogramme text,
  date_activite date,
  heure_debut time,
  lieu text,
  capacite_max integer,
  places_prises integer,
  mes_accompagnants smallint,
  etiquettes public.etiquette_activite[],
  statut public.statut_activite,
  capacite_min integer,
  photo text,
  heure_fin time
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    a.id,
    a.identifiant_public,
    a.titre,
    a.categorie,
    a.pictogramme,
    a.date_activite,
    a.heure_debut,
    a.lieu,
    a.capacite_max,
    public.places_prises(a.id),
    (
      select i.accompagnants from public.inscription_activite i
      where i.activite_id = a.id and i.resident_id = auth.uid()
    ),
    a.etiquettes,
    a.statut,
    a.capacite_min,
    a.photos[1],
    a.heure_fin
  from public.activite a
  where (a.date_activite + a.heure_fin) >= public.maintenant_reference()
    and public.peut_consulter()
    and (
      a.statut = 'publiee'
      or a.organisateur = auth.uid()
      or (
        a.statut = 'annulee'
        and exists (
          select 1 from public.inscription_activite i
          where i.activite_id = a.id and i.resident_id = auth.uid()
        )
      )
    )
  order by a.date_activite, a.heure_debut;
$$;

revoke execute on function public.catalogue_activites() from public, anon;
grant execute on function public.catalogue_activites() to authenticated;

-- Les activités organisées donnent aussi leur heure de fin : l'écran Activités range chacune, à
-- venir ou archivée, d'après son heure de fin.
drop function public.mes_activites_organisees();

/**
 * Les activités que la personne connectée organise, passées et à venir, annulées comprises :
 * l'onglet « J'organise ». Même forme que le catalogue, sans filtre de date, avec l'heure de fin.
 */
create function public.mes_activites_organisees()
returns table (
  id uuid,
  identifiant_public text,
  titre text,
  categorie public.categorie_activite,
  pictogramme text,
  date_activite date,
  heure_debut time,
  lieu text,
  capacite_max integer,
  places_prises integer,
  mes_accompagnants smallint,
  etiquettes public.etiquette_activite[],
  statut public.statut_activite,
  capacite_min integer,
  heure_fin time
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    a.id,
    a.identifiant_public,
    a.titre,
    a.categorie,
    a.pictogramme,
    a.date_activite,
    a.heure_debut,
    a.lieu,
    a.capacite_max,
    public.places_prises(a.id),
    (
      select i.accompagnants from public.inscription_activite i
      where i.activite_id = a.id and i.resident_id = auth.uid()
    ),
    a.etiquettes,
    a.statut,
    a.capacite_min,
    a.heure_fin
  from public.activite a
  where a.organisateur = auth.uid() and public.peut_consulter()
  order by a.date_activite, a.heure_debut;
$$;

revoke execute on function public.mes_activites_organisees() from public, anon;
grant execute on function public.mes_activites_organisees() to authenticated;
