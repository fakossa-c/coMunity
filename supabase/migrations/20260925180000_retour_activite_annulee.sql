-- Suite au rebase de #16 sur #12 (gestion d'une activité) : la fiche restitue de nouveau
-- mon_retour_note/mon_retour_commentaire (colonnes perdues quand #12 a redéfini fiche_activite
-- pour y ajouter le statut), et une activité annulée n'accepte plus de retour : elle n'a jamais
-- eu lieu, même quand sa date est passée.

create or replace function public.laisser_retour(
  p_identifiant text,
  p_note smallint,
  p_commentaire text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  id_activite uuid;
  statut_actuel public.statut_activite;
begin
  if not public.peut_participer() then
    raise exception 'Seul un résident validé peut laisser un retour' using errcode = '42501';
  end if;

  select a.id, a.statut into id_activite, statut_actuel
  from public.activite a
  where a.identifiant_public = p_identifiant;
  if not found then
    raise exception 'Activité introuvable' using errcode = 'P0002';
  end if;
  if statut_actuel = 'annulee' then
    raise exception 'Une activité annulée n''a pas eu lieu : elle n''accepte pas de retour'
      using errcode = 'P0004';
  end if;

  if not exists (
    select 1 from public.inscription_activite i
    where i.activite_id = id_activite and i.resident_id = (select auth.uid())
  ) then
    raise exception 'Seul un participant inscrit peut laisser un retour' using errcode = '42501';
  end if;

  if not public.activite_est_passee(id_activite) then
    raise exception 'L''activité n''est pas encore terminée' using errcode = 'P0003';
  end if;

  insert into public.retour (activite_id, resident_id, note, commentaire)
  values (id_activite, (select auth.uid()), p_note, trim(p_commentaire))
  on conflict (activite_id, resident_id) do update
    set note = excluded.note, commentaire = excluded.commentaire;
end;
$$;

-- La fiche restitue mon_retour_note/mon_retour_commentaire, perdus quand #12 a redéfini
-- fiche_activite pour y ajouter le statut.
drop function public.fiche_activite(text);

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
  mon_retour_commentaire text
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
    a.organisateur is not distinct from auth.uid(),
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
    )
  from public.activite a
  join public.profil p on p.id = a.organisateur
  where a.identifiant_public = identifiant;
$$;

revoke execute on function public.fiche_activite(text) from public;
grant execute on function public.fiche_activite(text) to anon, authenticated;
