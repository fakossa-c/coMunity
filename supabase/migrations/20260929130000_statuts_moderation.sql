-- Modération des activités (ticket #14, spec #58) : deux statuts nouveaux. Une valeur d'enum ajoutée
-- ne s'utilise qu'après la fin de sa transaction : tout ce qui s'en sert est dans la migration
-- suivante. Migration additive, `publiee` et `annulee` ne bougent pas.

alter type public.statut_activite add value 'en_relecture';
alter type public.statut_activite add value 'masquee';

comment on type public.statut_activite is 'L''état d''une activité : publiée ; annulée (elle reste visible de ses inscrits) ; en relecture (mise de côté en attendant la décision du conseil syndical) ; masquée (retirée par le conseil syndical). En relecture ou masquée, elle n''est visible que de son créateur et du conseil syndical.';
