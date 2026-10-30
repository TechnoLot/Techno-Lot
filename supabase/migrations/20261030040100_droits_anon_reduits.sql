-- Droits réduits pour le rôle anon au niveau des tables (passe sécurité, 30 oct. 2026).
--
-- Pourquoi : défense en profondeur. Par défaut, Supabase donne à anon TOUS les
-- droits (SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER) sur
-- chaque table du schéma public ; seule la RLS protège les données. Une future
-- politique mal écrite (« using (true) ») rouvrirait tout, comme avant le
-- 30 oct. 2026. La RLS reste la règle ; ces droits retirés sont un second mur.
--
-- Ce que le site utilise encore avec anon (vérifié dans le code le 30 oct. 2026) :
--   - le site en ligne (branche main) insère directement dans soumissions ;
--     les politiques anon_insert existent aussi sur ad_leads, ad_events,
--     ad_sessions : l'INSERT anon est GARDÉ sur ces 4 tables tant que
--     20261030020100_revocation_ecritures_anon.sql n'est pas appliquée (elle le
--     retire ensuite) ;
--   - le code de dev ne fait que des appels de fonctions (rpc) avec anon :
--     soumission_enregistrer, lead_pub_enregistrer, suivi_pub_enregistrer,
--     limite_debit, journal_securite_ajouter (et track_ad_event pour main).
--     Elles sont SECURITY DEFINER (propriétaire postgres) : elles n'ont pas
--     besoin des droits de table d'anon.
--
-- Ne force PAS la RLS (« force row level security ») : les fonctions SECURITY
-- DEFINER dont le propriétaire est postgres en dépendent.
-- authenticated n'est pas touché ici (ses accès passent par est_admin()).
--
-- Sans risque pour le site en ligne : aucune lecture ni modification anon n'est
-- permise par la RLS aujourd'hui (aucune politique SELECT/UPDATE/DELETE pour anon).

-- 1. Plus aucune lecture ni modification anon sur aucune table publique.
revoke select, update, delete, truncate, references, trigger
  on all tables in schema public from anon;

-- 2. Plus d'insertion anon, sauf sur les 4 tables encore écrites par le site en
--    ligne (soumissions, ad_leads, ad_events, ad_sessions). Liste explicite,
--    lue dans information_schema.tables le 30 oct. 2026 (18 tables) ; une table
--    créée plus tard est couverte par l'étape 3.
revoke insert on
  public.ad_metrics_daily,
  public.ad_sync_runs,
  public.admin_notification_dismissed,
  public.admin_notification_state,
  public.admins,
  public.certificats_destruction,
  public.certificats_destruction_compteurs,
  public.companies,
  public.contacts,
  public.daily_prospect_batches,
  public.ebay_orders,
  public.ebay_sync_runs,
  public.email_logs,
  public.email_templates,
  public.lots,
  public.outreach_activities,
  public.sales,
  public.saved_lots
  from anon;

-- 3. Les tables créées plus tard par postgres (migrations) ne donnent plus
--    aucun droit à anon. (Les défauts du rôle supabase_admin, géré par
--    Supabase, ne sont pas modifiables ici.)
alter default privileges for role postgres in schema public revoke all on tables from anon;

-- Vérifier (lecture seule) :
--   select table_name, string_agg(privilege_type, ',' order by privilege_type)
--     from information_schema.role_table_grants
--    where table_schema = 'public' and grantee = 'anon' group by 1;
--     -- attendu : seulement ad_events, ad_leads, ad_sessions, soumissions → INSERT
--     -- (aucune ligne après 20261030020100_revocation_ecritures_anon.sql)
--   select defaclacl from pg_default_acl
--    where defaclrole = 'postgres'::regrole and defaclnamespace = 'public'::regnamespace
--      and defaclobjtype = 'r';                                       -- sans « anon= »
