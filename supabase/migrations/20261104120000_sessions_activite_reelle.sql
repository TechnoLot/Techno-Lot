-- Sessions fermées après 1 h sans activité RÉELLE de l'utilisateur (4 nov. 2026).
--
-- Pourquoi : demande de l'utilisateur — « si ça fait plus qu'une heure qu'on
-- n'a rien fait sur la page, ça doit nous déconnecter ». La tâche
-- « securite-sessions-inactives » (20261030231500_sessions_inactivite_1h.sql)
-- se fiait au dernier RAFRAÎCHISSEMENT du jeton. Or un onglet de l'admin
-- ouvert interroge le serveur toutes les 30 s (notifications), ce qui rafraîchit
-- le jeton : tant que l'onglet restait ouvert, la session ne mourait jamais
-- (12 h constatées).
--
-- Comment : le navigateur (assets/outils/garde-activite.js) ne compte que la
-- souris, le clavier, la molette et le tactile, et le signale au plus toutes les
-- 5 minutes (POST /api/admin/activite → public.session_activite_noter).
-- securite.fermer_sessions_inactives() prend comme référence cette dernière
-- activité signalée. Le navigateur déconnecte lui-même à 60 minutes ; cette tâche
-- est le filet de sécurité côté serveur (ordinateur en veille, onglet fermé,
-- navigateur coupé).
--
-- Pourquoi 65 minutes : le dernier signal peut avoir jusqu'à 5 minutes de retard
-- sur la dernière vraie activité. Le serveur ne ferme donc JAMAIS une session
-- moins de 60 minutes après celle-ci, et au plus tard environ 70 minutes après
-- (65 + une passe toutes les 5 minutes).
--
-- Sans danger avant le déploiement du code : une session SANS ligne d'activité
-- garde exactement l'ancienne règle (refreshed_at, sinon updated_at, sinon
-- created_at, en UTC). Cette migration peut donc être appliquée AVANT de mettre
-- le code en ligne, et doit l'être : sinon POST /api/admin/activite appelle une
-- fonction absente et répond 500 (journal erreur.5xx).
--
-- La reconnexion quotidienne (20261030040000_sessions_24h.sql) ne change pas.
-- auth.sessions : refreshed_at est un « timestamp » sans fuseau en UTC ;
-- updated_at et created_at sont des timestamptz. Pas de clé étrangère vers
-- auth.sessions : la fermeture retire les lignes orphelines à chaque passe.
--
-- Retour arrière (remet l'ancienne règle, même nom de tâche = remplacement) :
--   select cron.schedule('securite-sessions-inactives', '*/5 * * * *',
--     $cmd$delete from auth.sessions where coalesce(refreshed_at, updated_at at time zone 'UTC', created_at at time zone 'UTC') < (now() at time zone 'UTC') - interval '65 minutes'$cmd$);
--   drop function securite.fermer_sessions_inactives();
--   drop function public.session_activite_noter(text, uuid);
--   drop table securite.activite_sessions;

-- 1. Dernière activité réelle, par session -----------------------------------------------

create table if not exists securite.activite_sessions (
  session_id uuid primary key,
  derniere_activite timestamptz not null default now()
);

-- Défense en profondeur : RLS sans politique + aucun droit pour les rôles de l'API.
alter table securite.activite_sessions enable row level security;
revoke all on table securite.activite_sessions from public, anon, authenticated;
comment on table securite.activite_sessions is
  'Dernière activité réelle (souris, clavier, tactile) signalée par le navigateur, par session Auth. Lue par securite.fermer_sessions_inactives().';

-- 2. Écriture par le serveur (secret obligatoire) ------------------------------------------

create or replace function public.session_activite_noter(
  p_secret text,
  p_session uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $fn$
begin
  if not securite.secret_valide(p_secret) then
    raise exception 'accès refusé' using errcode = '42501';
  end if;
  if p_session is null then
    raise exception 'paramètres invalides' using errcode = '22023';
  end if;

  insert into securite.activite_sessions as a (session_id, derniere_activite)
  values (p_session, now())
  on conflict (session_id) do update set
    derniere_activite = excluded.derniere_activite;
end;
$fn$;

revoke all on function public.session_activite_noter(text, uuid) from public;
grant execute on function public.session_activite_noter(text, uuid) to anon, authenticated;
comment on function public.session_activite_noter(text, uuid) is
  'Note la dernière activité réelle d''une session (securite.activite_sessions). Exige le secret serveur.';

-- 3. Fermeture des sessions inactives (interne, appelée par pg_cron) ----------------------

-- language sql : le corps est vérifié dès la création (colonnes, types), une
-- erreur fait donc échouer la migration au lieu de chaque passe de la tâche.
create or replace function securite.fermer_sessions_inactives()
returns void
language sql
set search_path = ''
as $fn$
  delete from auth.sessions s
  where coalesce(
    (select a.derniere_activite from securite.activite_sessions a where a.session_id = s.id),
    coalesce(s.refreshed_at, s.updated_at at time zone 'UTC', s.created_at at time zone 'UTC') at time zone 'UTC'
  ) < now() - interval '65 minutes';

  delete from securite.activite_sessions a
  where not exists (select 1 from auth.sessions s where s.id = a.session_id);
$fn$;

revoke all on function securite.fermer_sessions_inactives() from public, anon, authenticated;
comment on function securite.fermer_sessions_inactives() is
  'Ferme les sessions sans activité réelle depuis 65 minutes (ancienne règle sans ligne d''activité) et retire les lignes orphelines. Interne.';

-- 4. Tâche planifiée -----------------------------------------------------------------------

do $cron$
begin
  -- cron.schedule remplace la tâche du même nom (migration rejouable).
  perform cron.schedule(
    'securite-sessions-inactives',
    '*/5 * * * *',
    'select securite.fermer_sessions_inactives()'
  );
end;
$cron$;

-- Vérifier (lecture seule) :
--   select jobname, schedule, command, active from cron.job where jobname = 'securite-sessions-inactives';
--   select status, return_message, start_time from cron.job_run_details
--    where jobid = (select jobid from cron.job where jobname = 'securite-sessions-inactives')
--    order by start_time desc limit 5;                                   -- « succeeded »
--   select count(*) from securite.activite_sessions;                     -- une ligne par session active
