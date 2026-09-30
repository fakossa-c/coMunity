-- Description d'une activité (ticket #133) : le champ « Description » de Proposer est limité à
-- 600 caractères, comme le dit sa saisie. La colonne existait sans limite et aucune écriture de
-- l'application ne la remplissait : la contrainte est additive et ne change rien au code de `main`.
-- `not valid` : elle ne contrôle que les écritures à venir, jamais les lignes déjà en base.

alter table public.activite
  add constraint activite_description_600
  check (length(description) <= 600) not valid;

comment on column public.activite.description is 'La description de l''activité, bloc « Description » de la fiche : 600 caractères au plus. Distincte du mot d''accueil (`mot_accueil`), le mot personnel de l''organisateur en tête de la fiche.';
