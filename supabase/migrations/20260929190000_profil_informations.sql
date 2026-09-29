-- Mes informations (ticket #18, spec #59). Décision du 25/09/2026 : le pseudo est le seul nom que
-- les voisins voient d'un résident, membre du conseil syndical compris. Le prénom et le nom réels,
-- obligatoires à l'inscription, ne servent qu'au conseil syndical pour valider le compte : aucun
-- voisin ne les lit, il n'y a donc pas de réglage de visibilité pour eux.
--
-- Migration additive pour le code de `main` : des colonnes et des tables nouvelles, un bucket, une
-- fonction de lecture. `nom_affiche(text, text)` disparaît, mais elle n'est appelée que par les
-- trois fonctions recréées ici.

alter table public.profil
  add column pseudo text
    constraint profil_pseudo_valide check (length(trim(pseudo)) between 1 and 50),
  add column telephone text
    constraint profil_telephone_valide check (length(trim(telephone)) between 6 and 20),
  add column batiment text
    constraint profil_batiment_valide check (length(trim(batiment)) between 1 and 40),
  add column etage smallint
    constraint profil_etage_valide check (etage between 0 and 99),
  add column photo_chemin text
    constraint profil_photo_chemin_valide check (
      photo_chemin ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.jpg$'
      and split_part(photo_chemin, '/', 1) = id::text
    ),
  add column telephone_visible boolean not null default false,
  add column batiment_visible boolean not null default false,
  add column etage_visible boolean not null default false;

comment on column public.profil.pseudo is 'Le seul nom sous lequel les voisins voient la personne. Prérempli avec le prénom et l''initiale du nom (« Danielle M. »), modifiable. Obligatoire, sauf pour un membre du conseil syndical qui n''a pas encore saisi son prénom et son nom.';
comment on column public.profil.photo_chemin is 'Chemin de la photo dans le bucket `profils` (`<id du profil>/<photo>.jpg`) ; `null` sans photo. Elle ne se remplace pas sur place : la nouvelle a un nouveau chemin. Seuls la personne et le conseil syndical la voient.';
comment on column public.profil.telephone_visible is 'Vrai quand les voisins lisent le téléphone (`fiche_voisin`). Masqué par défaut.';
comment on column public.profil.batiment_visible is 'Vrai quand les voisins lisent le bâtiment (`fiche_voisin`). Masqué par défaut.';
comment on column public.profil.etage_visible is 'Vrai quand les voisins lisent l''étage (`fiche_voisin`). Masqué par défaut.';

/** « Danielle M. » : le pseudo d'un compte qui n'en a pas choisi, déduit de son prénom et de son nom. */
create function public.preremplir_pseudo()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.pseudo is null and new.prenom is not null and new.nom is not null then
    new.pseudo := new.prenom || ' ' || upper(left(new.nom, 1)) || '.';
  end if;
  return new;
end;
$$;

revoke execute on function public.preremplir_pseudo() from public, anon, authenticated;

-- À l'inscription, à l'amorçage d'un membre du conseil syndical et quand `completer_profil` (collègue
-- invité, compte plus ancien) enregistre enfin son prénom et son nom.
create trigger preremplir_pseudo
  before insert or update of prenom, nom on public.profil
  for each row execute function public.preremplir_pseudo();

-- Les comptes existants gardent le nom que les voisins lisaient jusqu'ici.
update public.profil
set pseudo = prenom || ' ' || upper(left(nom, 1)) || '.'
where prenom is not null and nom is not null;

alter table public.profil
  add constraint pseudo_present check (
    pseudo is not null or (role = 'syndic' and (prenom is null or nom is null))
  );

-- La personne modifie ses informations ; le prénom et le nom ne se modifient pas (ils restent
-- au conseil syndical). La politique de modification de `reglages_affichage` la limite à sa ligne.
grant update (
  pseudo, telephone, batiment, etage, photo_chemin,
  telephone_visible, batiment_visible, etage_visible
) on public.profil to authenticated;

/**
 * Le nom sous lequel un résident est lu par un autre, membre du conseil syndical compris : son
 * pseudo. C'est le seul endroit qui décide du nom lu.
 */
create function public.nom_affiche(p public.profil)
returns text
language sql
immutable
set search_path = ''
as $$
  select p.pseudo;
$$;

revoke execute on function public.nom_affiche(public.profil) from public, anon;
grant execute on function public.nom_affiche(public.profil) to authenticated;

create or replace function public.participants_activite(identifiant text)
returns table (nom_affiche text, accompagnants smallint)
language sql
stable
security definer
set search_path = ''
as $$
  select public.nom_affiche(p), i.accompagnants
  from public.inscription_activite i
  join public.activite a on a.id = i.activite_id
  join public.profil p on p.id = i.resident_id
  where a.identifiant_public = identifiant
    and public.peut_consulter()
    and public.peut_voir_activite(a.statut, a.organisateur)
  order by i.inscrit_le;
$$;

create or replace function public.activites_a_moderer()
returns table (
  identifiant_public text,
  titre text,
  categorie public.categorie_activite,
  pictogramme text,
  date_activite date,
  heure_debut time,
  lieu text,
  statut public.statut_activite,
  raison_relecture text,
  message_moderation text,
  organisateur_nom_affiche text,
  publiee_le timestamptz
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
    a.date_activite,
    a.heure_debut,
    a.lieu,
    a.statut,
    m.raison_relecture,
    m.message,
    public.nom_affiche(p),
    a.publiee_le
  from public.activite a
  left join public.profil p on p.id = a.organisateur
  left join public.moderation_activite m on m.activite_id = a.id
  where a.statut in ('en_relecture', 'masquee') and public.est_syndic()
  order by (a.statut = 'masquee'), a.publiee_le;
$$;

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
    case when public.peut_consulter() then public.nom_affiche(p) end,
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

drop function public.nom_affiche(text, text);

/**
 * Ce qu'un résident lit d'un voisin : son pseudo, plus le téléphone, le bâtiment et l'étage que
 * le voisin a rendus visibles. Jamais son prénom ni son nom, ni sa photo. Le conseil syndical, lui,
 * lit tout le profil directement. Vide pour un compte qui ne consulte pas la résidence, et pour un
 * voisin dont le compte n'est pas validé.
 */
create function public.fiche_voisin(voisin uuid)
returns table (pseudo text, telephone text, batiment text, etage smallint)
language sql
stable
security definer
set search_path = ''
as $$
  select
    p.pseudo,
    case when p.telephone_visible then p.telephone end,
    case when p.batiment_visible then p.batiment end,
    case when p.etage_visible then p.etage end
  from public.profil p
  where p.id = voisin and p.statut = 'valide' and public.peut_consulter();
$$;

revoke execute on function public.fiche_voisin(uuid) from public, anon;
grant execute on function public.fiche_voisin(uuid) to authenticated;

-- Centres d'intérêt : le libellé libre que la personne déclare pour lui-même. Seule la personne et le
-- conseil syndical les lisent ; la découverte des voisins aux mêmes affinités est reportée (spec #1).
create table public.centre_interet (
  id uuid primary key default gen_random_uuid(),
  profil_id uuid not null default auth.uid() references public.profil (id) on delete cascade,
  libelle text not null check (length(libelle) between 1 and 40),
  cree_le timestamptz not null default now()
);

comment on table public.centre_interet is 'Un centre d''intérêt déclaré par un résident (Mes intérêts). Effacé avec son compte.';

/** Le libellé est enregistré sans les espaces qui l'entourent. */
create function public.nettoyer_centre_interet()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.libelle := trim(new.libelle);
  return new;
end;
$$;

revoke execute on function public.nettoyer_centre_interet() from public, anon, authenticated;

create trigger nettoyer_centre_interet
  before insert or update of libelle on public.centre_interet
  for each row execute function public.nettoyer_centre_interet();

-- Le même centre d'intérêt ne se déclare pas deux fois, à la casse près.
create unique index centre_interet_libelle_unique
  on public.centre_interet (profil_id, lower(libelle));

alter table public.centre_interet enable row level security;

revoke all on public.centre_interet from anon, authenticated;
grant select, delete on public.centre_interet to authenticated;
grant insert (profil_id, libelle) on public.centre_interet to authenticated;
grant update (libelle) on public.centre_interet to authenticated;

create policy "Chacun lit ses centres d'intérêt, le conseil syndical les lit tous"
  on public.centre_interet for select
  to authenticated
  using (profil_id = (select auth.uid()) or (select public.est_syndic()));

create policy "Chacun ajoute ses centres d'intérêt"
  on public.centre_interet for insert
  to authenticated
  with check (profil_id = (select auth.uid()));

create policy "Chacun modifie ses centres d'intérêt"
  on public.centre_interet for update
  to authenticated
  using (profil_id = (select auth.uid()))
  with check (profil_id = (select auth.uid()));

create policy "Chacun supprime ses centres d'intérêt"
  on public.centre_interet for delete
  to authenticated
  using (profil_id = (select auth.uid()));

-- Photo de profil : bucket privé, un dossier par profil. La compression du navigateur ne produit que
-- du JPEG, d'au plus quelques centaines de Ko : le bucket refuse tout le reste, et au-delà de 2 Mo.
-- Seuls la personne et le conseil syndical la lisent, par une adresse signée que le serveur donne.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('profils', 'profils', false, 2097152, array['image/jpeg']);

create policy "Chacun lit sa photo de profil, le conseil syndical les lit toutes"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'profils'
    and ((storage.foldername(name))[1] = (select auth.uid())::text or (select public.est_syndic()))
  );

create policy "Chacun dépose sa photo de profil dans son dossier"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'profils'
    and name ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.jpg$'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

-- Aucune politique de modification : une photo ne se remplace pas, on en dépose une autre.
create policy "Chacun retire sa photo de profil"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'profils'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
