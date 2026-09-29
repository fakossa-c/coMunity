-- Suppression du compte par le résident (ticket #41, spec #59).
--
-- Le compte disparaît avec son profil, ses inscriptions et ses réponses aux sondages. Ses
-- activités à venir avec des inscrits passent en `annulee` (les inscrits la voient), les autres
-- à venir sont supprimées ; ses activités passées restent, sans organisateur ; ses retours
-- restent, sans auteur. Une activité en relecture ou masquée est supprimée même avec des inscrits :
-- annulée, elle deviendrait publique, alors que ses inscrits ne la voient déjà plus.
--
-- Migration additive : deux colonnes deviennent facultatives et leur clé étrangère met à `null`
-- au lieu d'effacer ; une fonction est nouvelle ; la fiche, les retours d'une activité et la synthèse
-- du tableau de bord se relisent sans organisateur, avec les mêmes colonnes qu'avant.

alter table public.activite
  alter column organisateur drop not null,
  drop constraint activite_organisateur_fkey,
  add constraint activite_organisateur_fkey
    foreign key (organisateur) references public.profil (id) on delete set null;

comment on column public.activite.organisateur is '`null` quand le compte de l''organisateur est supprimé : l''activité passée reste, sans nom.';

alter table public.retour
  alter column resident_id drop not null,
  drop constraint retour_resident_id_fkey,
  add constraint retour_resident_id_fkey
    foreign key (resident_id) references public.profil (id) on delete set null;

comment on column public.retour.resident_id is '`null` quand le compte de l''auteur est supprimé : le retour reste, anonyme.';

/**
 * Supprime le compte de la personne connectée, si c'est un résident (un membre du syndic passe par
 * le retrait d'accès). Rend les identifiants des activités dont le dossier de photos doit être vidé
 * du bucket `activites` : celles qui viennent d'être supprimées ou annulées. Le serveur retire les
 * fichiers ensuite, le compte n'existant plus.
 */
create function public.supprimer_mon_compte()
returns uuid[]
language plpgsql
security definer
set search_path = ''
as $$
declare
  moi uuid := auth.uid();
  annulees uuid[];
  supprimees uuid[];
begin
  if moi is null or not exists (
    select 1 from public.profil where id = moi and role = 'resident'
  ) then
    raise exception 'Seul un résident supprime son compte ici' using errcode = '42501';
  end if;

  -- Le verrou de `s_inscrire` : personne ne s'inscrit pendant qu'on décide du sort de l'activité.
  perform 1 from public.activite where organisateur = moi for update;

  with maj as (
    update public.activite a
    set statut = 'annulee', photos = '{}'
    where a.organisateur = moi
      and (a.date_activite + a.heure_fin) >= now()
      and a.statut in ('publiee', 'annulee')
      and exists (select 1 from public.inscription_activite i where i.activite_id = a.id)
    returning a.id
  )
  select coalesce(array_agg(id), '{}') into annulees from maj;

  with sup as (
    delete from public.activite a
    where a.organisateur = moi
      and (a.date_activite + a.heure_fin) >= now()
      and (
        a.statut in ('en_relecture', 'masquee')
        or not exists (select 1 from public.inscription_activite i where i.activite_id = a.id)
      )
    returning a.id
  )
  select coalesce(array_agg(id), '{}') into supprimees from sup;

  -- Le profil, les inscriptions et les réponses aux sondages suivent en cascade ; les activités
  -- passées et les retours passent à `null`.
  delete from auth.users where id = moi;

  return annulees || supprimees;
end;
$$;

revoke execute on function public.supprimer_mon_compte() from public, anon;
grant execute on function public.supprimer_mon_compte() to authenticated;

-- Les retours d'une activité se lisent aussi quand son organisateur n'a plus de compte. La jointure
-- au profil, jamais lue, disparaît.
create or replace function public.retours_activite(identifiant text)
returns table (
  note_moyenne numeric,
  nombre_retours integer,
  commentaires jsonb
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    round(avg(r.note), 1),
    count(r.id)::integer,
    coalesce(
      jsonb_agg(jsonb_build_object('note', r.note, 'commentaire', r.commentaire) order by r.laisse_le desc)
        filter (where r.id is not null),
      '[]'::jsonb
    )
  from public.activite a
  left join public.retour r on r.activite_id = a.id
  where a.identifiant_public = identifiant
    and (a.organisateur = (select auth.uid()) or (select auth.uid()) in (
      select id from public.profil where role = 'syndic' and statut = 'valide'
    ))
  group by a.id;
$$;

-- Le tableau de bord compte l'activité passée d'un résident supprimé parmi celles des résidents.
/**
 * Les volumes de la période : activités, inscriptions, résidents différents inscrits (l'indicateur
 * principal du produit), part des activités créées par le conseil syndical ou par des résidents.
 * Les comptes validés et en attente sont ceux d'aujourd'hui, la période ne les touche pas. Une activité
 * dont l'organisateur a supprimé son compte (`organisateur` à `null`) reste une activité de résident :
 * seul un résident supprime son compte.
 */
create or replace function public.tableau_bord_synthese(p_debut date, p_fin date)
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
      left join public.profil p on p.id = t.organisateur
      where coalesce(p.role, 'resident') <> 'syndic'
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

-- La fiche d'une activité sans organisateur : pas de nom, pas « proposée par le syndic », et
-- personne n'en est l'organisateur (`null = null` ne l'aurait pas dit à un visiteur).
/**
 * La fiche d'une activité, lisible par tous à partir de son identifiant public, sauf en relecture
 * ou masquée (créateur et conseil syndical seuls). La jauge (places prises et capacité, `null` si
 * l'activité n'en a pas) est toujours donnée ; l'inscription et le retour de la personne connectée
 * ne sont donnés qu'à elle-même ; l'espace commun et ses consignes, qu'à un compte qui peut
 * consulter. Les photos sont publiques.
 */
create or replace function public.fiche_activite(identifiant text)
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
  est_organisateur boolean,
  capacite_max integer,
  places_prises integer,
  mes_accompagnants smallint,
  capacite_min integer,
  etiquettes public.etiquette_activite[],
  mot_accueil text,
  conseils_pratiques text,
  materiel_prevoir text,
  a_apporter text,
  precision_acces text,
  statut public.statut_activite,
  mon_retour_note smallint,
  mon_retour_commentaire text,
  espace_commun_id uuid,
  consignes_espace text,
  photos text[],
  message_moderation text,
  raison_relecture text
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
    coalesce(p.role = 'syndic', false),
    case when public.peut_consulter() then public.nom_affiche(p.prenom, p.nom) end,
    coalesce(a.organisateur = auth.uid(), false),
    a.capacite_max,
    public.places_prises(a.id),
    (
      select i.accompagnants from public.inscription_activite i
      where i.activite_id = a.id and i.resident_id = auth.uid()
    ),
    a.capacite_min,
    a.etiquettes,
    a.mot_accueil,
    a.conseils_pratiques,
    a.materiel_prevoir,
    a.a_apporter,
    a.precision_acces,
    a.statut,
    (
      select r.note from public.retour r
      where r.activite_id = a.id and r.resident_id = auth.uid()
    ),
    (
      select r.commentaire from public.retour r
      where r.activite_id = a.id and r.resident_id = auth.uid()
    ),
    case when public.peut_consulter() then a.espace_commun_id end,
    case when public.peut_consulter() then e.consignes end,
    a.photos,
    case
      when coalesce(a.organisateur = auth.uid(), false) or public.est_syndic() then m.message
    end,
    case when public.est_syndic() then m.raison_relecture end
  from public.activite a
  left join public.profil p on p.id = a.organisateur
  left join public.espace_commun e on e.id = a.espace_commun_id
  left join public.moderation_activite m on m.activite_id = a.id
  where a.identifiant_public = identifiant
    and public.peut_voir_activite(a.statut, a.organisateur);
$$;

revoke execute on function public.fiche_activite(text) from public;
grant execute on function public.fiche_activite(text) to anon, authenticated;
