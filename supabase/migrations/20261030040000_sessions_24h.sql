-- Sessions Supabase fermées après 24 h (passe sécurité, 30 oct. 2026).
--
-- Pourquoi : décision du 30 oct. 2026 — reconnexion obligatoire CHAQUE JOUR.
-- L'application l'applique déjà (lib/securite/age-session.ts : 24 h au plus
-- depuis la dernière connexion), mais seulement quand la session lui est
-- présentée. Un jeton de rafraîchissement volé, utilisé directement contre
-- l'API Auth (POST /auth/v1/token?grant_type=refresh_token), ne passe jamais
-- par le site : il restait valable indéfiniment. Le plafond de durée des
-- sessions (« time-box ») de Supabase n'existe qu'au forfait Pro.
--
-- Comment : une tâche pg_cron « securite-sessions-24h », toutes les 15 minutes,
-- supprime de auth.sessions toute session créée il y a plus de 24 h. Les jetons
-- de rafraîchissement (auth.refresh_tokens.session_id) et les preuves MFA
-- (auth.mfa_amr_claims.session_id) liés partent avec elle (clés étrangères
-- ON DELETE CASCADE, vérifiées le 30 oct. 2026). La tâche tourne sous le
-- propriétaire de la tâche (postgres, qui a le droit DELETE sur auth.sessions et
-- contourne la RLS de cette table) ; aucun secret dans la commande.
--
-- Effet attendu : toute session de plus de 24 h est fermée côté Supabase dans
-- les 15 minutes, y compris une session dont le jeton a été volé ; le jeton
-- d'accès (JWT) déjà émis expire de lui-même (durée de vie courte), et le
-- rafraîchir devient impossible. L'admin se reconnecte (mot de passe + code)
-- au plus tard 24 h 15 après sa dernière connexion.
--
-- ATTENTION : la PREMIÈRE exécution (au plus 15 minutes après l'application)
-- déconnecte toutes les sessions existantes de plus de 24 h (le 30 oct. 2026 :
-- 2 sessions sur 2). Appliquer à un moment où une reconnexion ne dérange pas.
--
-- Retour arrière : select cron.unschedule('securite-sessions-24h');

do $cron$
begin
  -- cron.schedule remplace la tâche du même nom si elle existe (migration rejouable).
  perform cron.schedule(
    'securite-sessions-24h',
    '*/15 * * * *',
    $cmd$delete from auth.sessions where created_at < now() - interval '24 hours'$cmd$
  );
end;
$cron$;

-- Vérifier (lecture seule) :
--   select jobname, schedule, username, active from cron.job where jobname = 'securite-sessions-24h';
--   select status, return_message, start_time from cron.job_run_details
--    where jobid = (select jobid from cron.job where jobname = 'securite-sessions-24h')
--    order by start_time desc limit 5;                                   -- « succeeded »
--   select count(*) from auth.sessions where created_at < now() - interval '24 hours 15 minutes';  -- 0
