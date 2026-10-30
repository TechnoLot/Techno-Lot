-- Tâches pg_cron des fonctions Edge process-emails / process-sales : le Bearer
-- CRON_SECRET quitte la commande en clair (cron.job.command) pour le Vault.
--
-- (i)  Crée le secret Vault « cron_secret_edge » à partir du Bearer écrit
--      aujourd'hui dans la commande de la tâche process-emails-daily. Le jeton
--      est extrait par expression régulière ICI, dans le SQL : il n'est jamais
--      affiché ni écrit dans ce fichier.
-- (ii) Déprogramme puis reprogramme process-emails-daily et process-sales-daily
--      à l'identique (mêmes horaires, URL, en-têtes et corps), mais avec le
--      Bearer lu dans vault.decrypted_secrets au moment de l'exécution
--      (même modèle que supabase/cron/sync-live.sql).
--
-- Idempotente : si le secret existe déjà, il est gardé tel quel et les tâches
-- sont simplement reprogrammées (même résultat). Sur une base neuve (ni secret
-- ni tâche en clair), elle échoue avec un message clair : créer d'abord le
-- secret à la main, une seule fois, sans le versionner :
--   select vault.create_secret('<CRON_SECRET>', 'cron_secret_edge', 'Bearer CRON_SECRET des fonctions Edge (pg_cron)');
--
-- Rotation plus tard : select vault.update_secret(
--   (select id from vault.secrets where name = 'cron_secret_edge'), '<nouveau>');
-- puis mettre la même valeur dans Edge Functions → Secrets → CRON_SECRET.

do $$
declare
  v_commande text;
  v_jeton text;
  v_job record;
begin
  -- (i) Secret Vault
  if not exists (select 1 from vault.secrets where name = 'cron_secret_edge') then
    select command into v_commande
    from cron.job
    where jobname = 'process-emails-daily';

    v_jeton := substring(v_commande from '[Bb]earer\s+([^''"\s]+)');

    if v_jeton is null or length(v_jeton) < 32 then
      raise exception 'cron_secret_edge absent du Vault et aucun Bearer en clair (>= 32 caractères) dans process-emails-daily : créer le secret à la main (voir l''en-tête de cette migration).';
    end if;

    perform vault.create_secret(
      v_jeton,
      'cron_secret_edge',
      'Bearer CRON_SECRET des fonctions Edge process-emails / process-sales (pg_cron)'
    );
    v_jeton := null;
  end if;

  -- (ii) Tâches reprogrammées à l'identique, Bearer lu dans le Vault à l'exécution
  for v_job in select jobname from cron.job
               where jobname in ('process-emails-daily', 'process-sales-daily')
  loop
    perform cron.unschedule(v_job.jobname);
  end loop;

  perform cron.schedule(
    'process-emails-daily',
    '0 21 * * *',
    $cmd$
  select net.http_post(
    url := 'https://aznelukkwitvttycwnjb.supabase.co/functions/v1/process-emails',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret_edge'),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
  $cmd$
  );

  perform cron.schedule(
    'process-sales-daily',
    '5 21 * * *',
    $cmd$
  select net.http_post(
    url := 'https://aznelukkwitvttycwnjb.supabase.co/functions/v1/process-sales',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret_edge'),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
  $cmd$
  );
  -- FIN DES ÉTAPES
end $$;

-- Vérifier (sans afficher le secret) :
--   select jobname, schedule, active, command ~ 'vault\.decrypted_secrets' as via_vault from cron.job;
--   select name, length(decrypted_secret) from vault.decrypted_secrets where name = 'cron_secret_edge';
