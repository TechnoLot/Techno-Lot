-- Sessions Supabase fermées après environ 1 h d'absence (30 oct. 2026).
--
-- Pourquoi : demande de l'utilisateur le soir de la mise en ligne — s'il quitte
-- l'admin (onglet fermé, ordinateur en veille) pendant environ une heure, il
-- doit se reconnecter (mot de passe + code de double authentification). Le
-- délai d'inactivité de Supabase (« Inactivity timeout ») n'existe qu'au
-- forfait Pro.
--
-- Comment : une tâche pg_cron « securite-sessions-inactives », toutes les
-- 5 minutes, supprime de auth.sessions toute session dont le dernier
-- rafraîchissement (refreshed_at, sinon updated_at, sinon created_at) date de
-- plus de 65 minutes. Prérequis : jetons d'accès de 10 minutes (Supabase →
-- Authentication → Sessions → Access token expiry time = 600, réglé le
-- 30 oct. 2026). Tant qu'un onglet de l'admin est ouvert, le tableau de bord
-- interroge le serveur toutes les 30 s et le jeton est rafraîchi au moins
-- toutes les 10 minutes : la session reste vivante. Onglet fermé, plus aucun
-- rafraîchissement : la session est fermée entre 55 et 70 minutes après le
-- départ. Jetons de rafraîchissement et preuves MFA liés partent avec la
-- session (ON DELETE CASCADE, cf. 20261030040000_sessions_24h.sql, qui reste :
-- reconnexion obligatoire chaque jour). refreshed_at est un « timestamp »
-- sans fuseau en UTC : comparaison faite en UTC.
--
-- ATTENTION : ne pas baisser le seuil sous ~20 minutes, ni remonter la durée
-- des jetons au-dessus de ~50 minutes, sans revoir ce calcul (une session
-- active serait fermée entre deux rafraîchissements).
--
-- Retour arrière : select cron.unschedule('securite-sessions-inactives');
-- (et remettre Access token expiry time à 3600 si on le souhaite).

do $cron$
begin
  -- cron.schedule remplace la tâche du même nom si elle existe (migration rejouable).
  perform cron.schedule(
    'securite-sessions-inactives',
    '*/5 * * * *',
    $cmd$delete from auth.sessions where coalesce(refreshed_at, updated_at at time zone 'UTC', created_at at time zone 'UTC') < (now() at time zone 'UTC') - interval '65 minutes'$cmd$
  );
end;
$cron$;

-- Vérifier (lecture seule) :
--   select jobname, schedule, active from cron.job where jobname = 'securite-sessions-inactives';
--   select status, return_message, start_time from cron.job_run_details
--    where jobid = (select jobid from cron.job where jobname = 'securite-sessions-inactives')
--    order by start_time desc limit 5;                                   -- « succeeded »
