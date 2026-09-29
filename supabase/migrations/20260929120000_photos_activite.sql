-- Photos d'activité (ticket #10) : jusqu'à 5 photos par activité, compressées dans le navigateur
-- puis déposées dans un bucket public. La liste ordonnée vit dans `activite.photos` (la première
-- est l'image de la carte et de l'aperçu du lien) ; seule `definir_photos_activite` l'écrit.
-- Migration additive : une colonne, un bucket, des politiques et une fonction nouvelles ; la fiche
-- et le catalogue gagnent une colonne, sans en perdre.

alter table public.activite
  add column photos text[] not null default '{}'
    constraint activite_photos_au_plus_cinq check (cardinality(photos) <= 5);

comment on column public.activite.photos is 'Chemins des photos dans le bucket `activites`, dans l''ordre : la première est l''image de la carte et de l''aperçu du lien. Au plus 5. Écrite par `definir_photos_activite`, jamais directement (la colonne n''a aucun droit d''écriture).';

-- Le bucket est public : l'adresse d'une photo se partage dans WhatsApp et sert l'aperçu du lien.
-- La compression du navigateur ne produit que du JPEG, d'au plus quelques centaines de Ko : le
-- bucket refuse tout le reste, et au-delà de 2 Mo.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('activites', 'activites', true, 2097152, array['image/jpeg']);

/**
 * Vrai si la personne connectée gère les photos de l'activité dont `p_dossier` est l'identifiant :
 * son créateur (encore un compte validé) ou un membre du conseil syndical.
 */
create function public.gere_photos_activite(p_dossier text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.activite a
    where a.id::text = p_dossier
      and ((a.organisateur = auth.uid() and public.peut_participer()) or public.est_syndic())
  );
$$;

/** Vrai si aucune activité n'a l'identifiant `p_dossier` : ses photos restantes sont des orphelines. */
create function public.dossier_photos_orphelin(p_dossier text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select not exists (select 1 from public.activite a where a.id::text = p_dossier);
$$;

revoke execute on function public.gere_photos_activite(text) from public, anon;
grant execute on function public.gere_photos_activite(text) to authenticated;
revoke execute on function public.dossier_photos_orphelin(text) from public, anon;
grant execute on function public.dossier_photos_orphelin(text) to authenticated;

-- Une photo s'appelle `<identifiant de l'activité>/<identifiant de la photo>.jpg`. Le dossier la
-- rattache à son activité, donc à son créateur. Aucune politique de modification : une photo ne
-- se remplace pas, on en dépose une autre.
create policy "Tout le monde lit les photos d'activité"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'activites');

create policy "Le créateur et le conseil syndical déposent une photo d'activité"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'activites'
    and name ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.jpg$'
    and (select public.gere_photos_activite((storage.foldername(name))[1]))
  );

-- Une activité supprimée ne laisse plus personne pour gérer ses photos : n'importe quel compte
-- connecté peut alors les retirer, le serveur le fait juste après la suppression.
create policy "Le créateur et le conseil syndical retirent une photo d'activité"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'activites'
    and (
      (select public.gere_photos_activite((storage.foldername(name))[1]))
      or (select public.dossier_photos_orphelin((storage.foldername(name))[1]))
    )
  );

/**
 * Fixe la liste ordonnée des photos d'une activité (au plus 5, chacune dans le dossier de
 * l'activité) et rend les chemins qui n'y figurent plus, pour que le serveur supprime leurs
 * fichiers. Réservée à son créateur et au conseil syndical.
 */
create function public.definir_photos_activite(p_identifiant text, p_chemins text[])
returns text[]
language plpgsql
security definer
set search_path = ''
as $$
declare
  cible public.activite;
  chemins text[] := coalesce(p_chemins, '{}');
  retirees text[];
begin
  select * into cible
  from public.activite
  where identifiant_public = p_identifiant
  for update;
  if not found then
    raise exception 'Activité introuvable' using errcode = 'P0002';
  end if;
  if not ((cible.organisateur = auth.uid() and public.peut_participer()) or public.est_syndic()) then
    raise exception 'Seuls le créateur et le conseil syndical gèrent les photos' using errcode = '42501';
  end if;
  if cardinality(chemins) > 5 then
    raise exception 'Une activité a au plus 5 photos' using errcode = 'P0009';
  end if;
  if exists (
       select 1 from unnest(chemins) c
       where c !~ ('^' || cible.id::text || '/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.jpg$')
     )
     or (select count(distinct c) from unnest(chemins) c) <> cardinality(chemins) then
    raise exception 'Chemin de photo invalide' using errcode = '22023';
  end if;

  retirees := array(select c from unnest(cible.photos) c where c <> all (chemins));
  update public.activite set photos = chemins where id = cible.id;
  return retirees;
end;
$$;

revoke execute on function public.definir_photos_activite(text, text[]) from public, anon;
grant execute on function public.definir_photos_activite(text, text[]) to authenticated;

-- La fiche donne les photos de l'activité, dans l'ordre.
drop function public.fiche_activite(text);

/**
 * La fiche d'une activité, lisible par tous à partir de son identifiant public. La jauge
 * (places prises et capacité, `null` si l'activité n'en a pas) est toujours donnée ;
 * l'inscription et le retour de la personne connectée ne sont donnés qu'à elle-même ; l'espace
 * commun et ses consignes, qu'à un compte qui peut consulter. Les photos sont publiques.
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
  photos text[]
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
    ),
    case when public.peut_consulter() then a.espace_commun_id end,
    case when public.peut_consulter() then e.consignes end,
    a.photos
  from public.activite a
  join public.profil p on p.id = a.organisateur
  left join public.espace_commun e on e.id = a.espace_commun_id
  where a.identifiant_public = identifiant;
$$;

revoke execute on function public.fiche_activite(text) from public;
grant execute on function public.fiche_activite(text) to anon, authenticated;

-- Le catalogue donne la première photo de chaque activité : l'image de sa carte.
drop function public.catalogue_activites();

/**
 * Les activités à venir, comme le catalogue de l'accueil, avec l'inscription de la personne
 * connectée, les étiquettes, le statut et la première photo de chaque activité. Une activité
 * annulée n'y figure que pour ses inscrits et son créateur.
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
  photo text
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
    a.photos[1]
  from public.activite a
  where a.date_activite >= current_date
    and public.peut_consulter()
    and (
      a.statut = 'publiee'
      or a.organisateur = auth.uid()
      or exists (
        select 1 from public.inscription_activite i
        where i.activite_id = a.id and i.resident_id = auth.uid()
      )
    )
  order by a.date_activite, a.heure_debut;
$$;

revoke execute on function public.catalogue_activites() from public, anon;
grant execute on function public.catalogue_activites() to authenticated;
