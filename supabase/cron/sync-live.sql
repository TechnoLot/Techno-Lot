-- Synchro en direct : pg_cron appelle /api/cron/sync chaque minute (aujourd'hui
-- et hier) et chaque heure (30 jours + ménage des journaux), même quand
-- personne n'est sur le site. À lancer UNE fois, après la mise en ligne de la
-- route, avec CRON_SECRET identique à celui du serveur (Hostinger).
-- Pas une migration : le secret ne doit jamais être versionné.

-- 1. Secret (remplacer la valeur ; une seule fois)
select vault.create_secret('<CRON_SECRET>', 'cron_secret', 'Bearer de /api/cron/sync');

-- 2. Tâches
select cron.schedule(
  'technolot-sync-live',
  '* * * * *',
  $$
  select net.http_post(
    url := 'https://technolot.ca/api/cron/sync',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')
    ),
    timeout_milliseconds := 110000
  );
  $$
);

select cron.schedule(
  'technolot-sync-hourly',
  '7 * * * *',
  $$
  select net.http_post(
    url := 'https://technolot.ca/api/cron/sync?days=30',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')
    ),
    timeout_milliseconds := 110000
  );
  $$
);

-- Vérifier : select * from cron.job; select * from cron.job_run_details order by start_time desc limit 5;
-- Arrêter : select cron.unschedule('technolot-sync-live'); select cron.unschedule('technolot-sync-hourly');
