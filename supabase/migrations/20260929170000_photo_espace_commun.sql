-- Photo d'un espace commun (ticket #93) : le conseil syndical ajoute, remplace et retire une photo
-- sur chaque espace commun, compressée dans le navigateur. `espace_commun.photo_chemin` dit
-- laquelle des photos du bucket est celle de l'espace ; sans photo, l'espace s'affiche sans image.
-- Migration additive : une colonne, un bucket et ses politiques, rien n'est retiré.

alter table public.espace_commun
  add column photo_chemin text
    constraint espace_commun_photo_chemin_valide
      check (photo_chemin ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.jpg$');

-- Une photo n'illustre qu'un espace : supprimer l'un ne retire pas la photo d'un autre.
create unique index espace_commun_photo_chemin_unique
  on public.espace_commun (photo_chemin)
  where photo_chemin is not null;

comment on column public.espace_commun.photo_chemin is 'Chemin de la photo dans le bucket `espaces-communs` ; `null` sans photo. Une photo ne se remplace pas sur place : la nouvelle a un nouveau chemin.';

grant insert (photo_chemin) on public.espace_commun to authenticated;
grant update (photo_chemin) on public.espace_commun to authenticated;

-- Le bucket est privé : la résidence n'est pas un lieu public, et seuls les comptes qui lisent les
-- espaces communs (résidents validés ou en attente, conseil syndical) voient leurs photos, par
-- une adresse signée que le serveur donne à chaque affichage. La compression du navigateur ne
-- produit que du JPEG, d'au plus quelques centaines de Ko : le bucket refuse tout le reste, et
-- au-delà de 2 Mo.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('espaces-communs', 'espaces-communs', false, 2097152, array['image/jpeg']);

create policy "Les comptes actifs lisent les photos d'espace commun"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'espaces-communs' and (select public.peut_consulter()));

create policy "Le conseil syndical dépose une photo d'espace commun"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'espaces-communs'
    and name ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.jpg$'
    and (select public.est_syndic())
  );

-- Aucune politique de modification : une photo ne se remplace pas, on en dépose une autre.
create policy "Le conseil syndical retire une photo d'espace commun"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'espaces-communs' and (select public.est_syndic()));
