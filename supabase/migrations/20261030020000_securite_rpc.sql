-- Fonctions SQL protégées par un secret serveur (passe sécurité, 30 oct. 2026).
--
-- Pourquoi : le formulaire de soumission, les leads de pub et le suivi des pubs
-- écrivaient directement en base avec le rôle anon (politiques « anon_insert »
-- et fonction track_ad_event ouverte à anon). La clé publishable étant publique
-- par nature, n'importe qui pouvait remplir ces tables sans passer par le site.
-- Décision du 30 oct. 2026 : les écritures publiques passent PAR LE SERVEUR, via
-- des fonctions SECURITY DEFINER qui exigent un secret connu du serveur seul.
-- Les mêmes fonctions servent aux limites de débit (securite.limites) et au
-- journal de sécurité durable (securite.journal).
--
-- Comment :
--   - schéma « securite » NON exposé à l'API (aucun droit pour anon/authenticated) ;
--   - le secret (variable serveur SECURITE_RPC_SECRET, 32 caractères ou plus,
--     jamais NEXT_PUBLIC_) n'est PAS dans ce fichier : seule son empreinte SHA-256
--     est en base, dans securite.secret_rpc, posée À PART (jamais versionnée) :
--       insert into securite.secret_rpc (empreinte)
--         values (extensions.digest('<valeur de SECURITE_RPC_SECRET>', 'sha256'));
--     Rotation : update securite.secret_rpc
--       set empreinte = extensions.digest('<nouvelle valeur>', 'sha256'), pose_le = now();
--     puis la même valeur chez Hostinger, Vercel (Preview) et dans .env.local.
--   - les fonctions publiques sont exécutables par anon/authenticated (le serveur
--     appelle avec la clé publishable, sans session) mais lèvent 42501 sans le
--     bon secret ; chaque paramètre est borné.
--
-- ADDITIF SEULEMENT : le site en ligne (branche main) utilise encore les
-- insertions anon ; rien n'est révoqué ici. La révocation est dans
-- 20261030020100_revocation_ecritures_anon.sql, à appliquer APRÈS la mise en
-- ligne du code qui appelle ces fonctions.
--
-- Ordre : 1) cette migration ; 2) empreinte du secret (ci-dessus) ;
-- 3) SECURITE_RPC_SECRET dans les variables du serveur + déploiement du code ;
-- 4) 20261030020100_revocation_ecritures_anon.sql.

-- 1. Schéma privé -----------------------------------------------------------------

create schema if not exists securite;
revoke all on schema securite from public, anon, authenticated;
comment on schema securite is
  'Données de sécurité (secret RPC, limites de débit, journal). Non exposé à l''API : accès par les fonctions public.* à secret seulement.';

-- 2. Tables -------------------------------------------------------------------------

-- Une seule ligne (id = true) : empreinte SHA-256 du secret serveur.
create table if not exists securite.secret_rpc (
  id boolean primary key default true check (id),
  empreinte bytea not null check (octet_length(empreinte) = 32),
  pose_le timestamptz not null default now()
);

-- Compteurs à fenêtre fixe. cle = HMAC-SHA256 hex calculé par le serveur
-- (aucune IP ni courriel en clair).
create table if not exists securite.limites (
  cle text primary key check (char_length(cle) between 1 and 128),
  fenetre_debut timestamptz not null,
  compte integer not null
);
create index if not exists limites_fenetre_debut_idx on securite.limites (fenetre_debut);

-- Journal de sécurité (lib/securite/journal.ts). Rétention : 90 jours.
create table if not exists securite.journal (
  id bigint generated always as identity primary key,
  ts timestamptz not null default now(),
  evenement text not null,
  resultat text,
  user_id uuid,
  ip text,
  ua text,
  request_id text,
  methode text,
  chemin text,
  statut integer,
  details jsonb
);
create index if not exists journal_ts_idx on securite.journal (ts);
create index if not exists journal_evenement_ts_idx on securite.journal (evenement, ts);
create index if not exists journal_ip_ts_idx on securite.journal (ip, ts);

-- Défense en profondeur : RLS sans politique + aucun droit pour les rôles de l'API.
alter table securite.secret_rpc enable row level security;
alter table securite.limites enable row level security;
alter table securite.journal enable row level security;
revoke all on all tables in schema securite from public, anon, authenticated;
revoke all on all sequences in schema securite from public, anon, authenticated;

-- 3. Contrôle du secret (interne) --------------------------------------------------------

create or replace function securite.secret_valide(p_secret text)
returns boolean
language sql
stable
set search_path = ''
as $fn$
  select coalesce(
    p_secret is not null
    and octet_length(p_secret) between 32 and 512
    and exists (
      select 1
      from securite.secret_rpc s
      where s.empreinte = extensions.digest(p_secret, 'sha256')
    ),
    false
  );
$fn$;

revoke all on function securite.secret_valide(text) from public, anon, authenticated;
comment on function securite.secret_valide(text) is
  'Vrai si p_secret a l''empreinte SHA-256 de securite.secret_rpc (faux sans ligne). Interne.';

-- 4. Limite de débit -------------------------------------------------------------------

-- 0 = permis ; sinon nombre de secondes avant de réessayer.
create or replace function public.limite_debit(
  p_secret text,
  p_cle text,
  p_fenetre_s integer,
  p_max integer
)
returns integer
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v securite.limites;
  v_maintenant timestamptz := clock_timestamp();
begin
  if not securite.secret_valide(p_secret) then
    raise exception 'accès refusé' using errcode = '42501';
  end if;
  if p_cle is null or char_length(p_cle) not between 1 and 128
     or p_fenetre_s is null or p_fenetre_s not between 1 and 86400
     or p_max is null or p_max not between 1 and 10000 then
    raise exception 'paramètres invalides' using errcode = '22023';
  end if;

  insert into securite.limites as l (cle, fenetre_debut, compte)
  values (p_cle, v_maintenant, 1)
  on conflict (cle) do update set
    fenetre_debut = case
      when l.fenetre_debut + make_interval(secs => p_fenetre_s) <= v_maintenant then v_maintenant
      else l.fenetre_debut
    end,
    compte = case
      when l.fenetre_debut + make_interval(secs => p_fenetre_s) <= v_maintenant then 1
      else least(l.compte + 1, 1000000)
    end
  returning * into v;

  if v.compte > p_max then
    return greatest(
      1,
      ceil(extract(epoch from (v.fenetre_debut + make_interval(secs => p_fenetre_s) - v_maintenant)))::integer
    );
  end if;
  return 0;
end;
$fn$;

revoke all on function public.limite_debit(text, text, integer, integer) from public;
grant execute on function public.limite_debit(text, text, integer, integer) to anon, authenticated;
comment on function public.limite_debit(text, text, integer, integer) is
  'Limite de débit à fenêtre fixe (securite.limites). Exige le secret serveur. 0 = permis, sinon secondes d''attente.';

-- 5. Journal de sécurité -----------------------------------------------------------------

-- Insère l'événement puis renvoie les compteurs des 5 dernières minutes pour ce
-- même événement : { "meme_ip_5min": n, "total_5min": n } (alertes, côté serveur).
create or replace function public.journal_securite_ajouter(
  p_secret text,
  p_evenement text,
  p_resultat text,
  p_user_id uuid,
  p_ip text,
  p_ua text,
  p_request_id text,
  p_methode text,
  p_chemin text,
  p_statut integer,
  p_details jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_ip text := left(p_ip, 64);
  v_details jsonb := p_details;
  v_meme_ip integer;
  v_total integer;
begin
  if not securite.secret_valide(p_secret) then
    raise exception 'accès refusé' using errcode = '42501';
  end if;
  if p_evenement is null or char_length(p_evenement) > 64
     or p_evenement !~ '^[a-z0-9_]+(\.[a-z0-9_]+)*$' then
    raise exception 'événement invalide' using errcode = '22023';
  end if;
  if p_resultat is not null and p_resultat not in ('ok', 'refus', 'echec') then
    raise exception 'résultat invalide' using errcode = '22023';
  end if;
  if v_details is not null
     and (jsonb_typeof(v_details) <> 'object' or octet_length(v_details::text) > 8192) then
    v_details := jsonb_build_object('tronque', true);
  end if;

  select count(*) filter (where j.ip is not distinct from v_ip), count(*)
    into v_meme_ip, v_total
    from securite.journal j
   where j.evenement = p_evenement
     and j.ts > now() - interval '5 minutes';

  -- Plafond anti-remplissage : au-delà de 5 000 lignes du même événement en
  -- 5 minutes, on compte sans enregistrer.
  if v_total < 5000 then
    insert into securite.journal
      (evenement, resultat, user_id, ip, ua, request_id, methode, chemin, statut, details)
    values (
      p_evenement,
      p_resultat,
      p_user_id,
      v_ip,
      left(p_ua, 300),
      left(p_request_id, 64),
      left(p_methode, 10),
      left(p_chemin, 300),
      case when p_statut between 100 and 599 then p_statut end,
      v_details
    );
  end if;

  return jsonb_build_object('meme_ip_5min', v_meme_ip + 1, 'total_5min', v_total + 1);
end;
$fn$;

revoke all on function public.journal_securite_ajouter(text, text, text, uuid, text, text, text, text, text, integer, jsonb) from public;
grant execute on function public.journal_securite_ajouter(text, text, text, uuid, text, text, text, text, text, integer, jsonb) to anon, authenticated;
comment on function public.journal_securite_ajouter(text, text, text, uuid, text, text, text, text, text, integer, jsonb) is
  'Ajoute une ligne à securite.journal (exige le secret serveur) et renvoie les compteurs des 5 dernières minutes de cet événement.';

-- 6. Formulaire de soumission ----------------------------------------------------------------

-- Insère dans public.soumissions EXACTEMENT les colonnes du formulaire
-- (app/api/soumission/route.ts) : id, nom, courriel, telephone, message,
-- locale, fichiers. Les colonnes de la table ne changent pas.
-- p_donnees : { id?, nom, courriel, telephone, message?, locale?, fichiers? }.
create or replace function public.soumission_enregistrer(p_secret text, p_donnees jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_id uuid;
  v_nom text;
  v_courriel text;
  v_telephone text;
  v_message text;
  v_locale text;
  v_fichiers text[] := '{}';
begin
  if not securite.secret_valide(p_secret) then
    raise exception 'accès refusé' using errcode = '42501';
  end if;
  if p_donnees is null or jsonb_typeof(p_donnees) <> 'object' then
    raise exception 'données invalides' using errcode = '22023';
  end if;

  -- id fourni par le serveur (il sert aussi d'en-tête X-Technolot-Soumission), sinon généré.
  if nullif(p_donnees->>'id', '') is not null then
    if (p_donnees->>'id') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
      raise exception 'identifiant invalide' using errcode = '22023';
    end if;
    v_id := (p_donnees->>'id')::uuid;
  else
    v_id := gen_random_uuid();
  end if;

  v_nom := left(btrim(coalesce(p_donnees->>'nom', '')), 200);
  v_courriel := btrim(coalesce(p_donnees->>'courriel', ''));
  v_telephone := left(btrim(coalesce(p_donnees->>'telephone', '')), 50);
  v_message := nullif(left(btrim(coalesce(p_donnees->>'message', '')), 10000), '');
  v_locale := case when p_donnees->>'locale' = 'en' then 'en' else 'fr' end;

  if v_nom = '' or v_courriel = '' or v_telephone = '' then
    raise exception 'champs obligatoires manquants' using errcode = '22023';
  end if;
  if char_length(v_courriel) > 254 or v_courriel !~ '^[^\s@]+@[^\s@]+\.[^\s@]+$' then
    raise exception 'courriel invalide' using errcode = '22023';
  end if;

  -- Noms des pièces jointes : 20 au plus (au-delà, la liste est coupée ; le
  -- courriel envoyé garde toutes les pièces), 255 caractères chacun.
  if jsonb_typeof(p_donnees->'fichiers') = 'array' then
    select coalesce(array_agg(left(f.valeur, 255) order by f.ordre), '{}')
      into v_fichiers
      from (
        select e.valeur, e.ordre
        from jsonb_array_elements_text(p_donnees->'fichiers') with ordinality as e(valeur, ordre)
        where e.valeur is not null and btrim(e.valeur) <> ''
        order by e.ordre
        limit 20
      ) f;
  elsif coalesce(jsonb_typeof(p_donnees->'fichiers'), 'null') <> 'null' then
    raise exception 'fichiers invalides' using errcode = '22023';
  end if;

  insert into public.soumissions (id, nom, courriel, telephone, message, locale, fichiers)
  values (v_id, v_nom, v_courriel, v_telephone, v_message, v_locale, v_fichiers);

  return v_id;
end;
$fn$;

revoke all on function public.soumission_enregistrer(text, jsonb) from public;
grant execute on function public.soumission_enregistrer(text, jsonb) to anon, authenticated;
comment on function public.soumission_enregistrer(text, jsonb) is
  'Enregistre une soumission du formulaire public (exige le secret serveur). Renvoie l''id.';

-- 7. Lead attribué à une pub --------------------------------------------------------------------

-- Mêmes colonnes que l'insertion de app/api/soumission/route.ts dans ad_leads.
-- Session inconnue (suivi bloqué par le navigateur) : lead gardé sans lien.
create or replace function public.lead_pub_enregistrer(p_secret text, p_donnees jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_sid text;
  v_session uuid;
  v_platform text;
begin
  if not securite.secret_valide(p_secret) then
    raise exception 'accès refusé' using errcode = '42501';
  end if;
  if p_donnees is null or jsonb_typeof(p_donnees) <> 'object' then
    raise exception 'données invalides' using errcode = '22023';
  end if;

  v_sid := p_donnees->>'session_id';
  if v_sid ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    v_session := v_sid::uuid;
    if not exists (select 1 from public.ad_sessions s where s.id = v_session) then
      v_session := null;
    end if;
  end if;

  v_platform := p_donnees->>'platform';
  if v_platform is null
     or v_platform not in ('meta', 'google', 'organic', 'referral', 'direct', 'email', 'other') then
    v_platform := 'direct';
  end if;

  insert into public.ad_leads (
    session_id, nom, courriel, telephone, platform,
    utm_source, utm_medium, utm_campaign, utm_content, utm_term,
    campaign_id, adset_id, ad_id, placement, fbclid, gclid, landing_path
  )
  values (
    v_session,
    nullif(left(btrim(p_donnees->>'nom'), 300), ''),
    nullif(left(btrim(p_donnees->>'courriel'), 300), ''),
    nullif(left(btrim(p_donnees->>'telephone'), 100), ''),
    v_platform,
    nullif(left(btrim(p_donnees->>'utm_source'), 300), ''),
    nullif(left(btrim(p_donnees->>'utm_medium'), 300), ''),
    nullif(left(btrim(p_donnees->>'utm_campaign'), 300), ''),
    nullif(left(btrim(p_donnees->>'utm_content'), 300), ''),
    nullif(left(btrim(p_donnees->>'utm_term'), 300), ''),
    nullif(left(btrim(p_donnees->>'campaign_id'), 100), ''),
    nullif(left(btrim(p_donnees->>'adset_id'), 100), ''),
    nullif(left(btrim(p_donnees->>'ad_id'), 100), ''),
    nullif(left(btrim(p_donnees->>'placement'), 100), ''),
    nullif(left(btrim(p_donnees->>'fbclid'), 500), ''),
    nullif(left(btrim(p_donnees->>'gclid'), 500), ''),
    nullif(left(btrim(p_donnees->>'landing_path'), 500), '')
  );
end;
$fn$;

revoke all on function public.lead_pub_enregistrer(text, jsonb) from public;
grant execute on function public.lead_pub_enregistrer(text, jsonb) to anon, authenticated;
comment on function public.lead_pub_enregistrer(text, jsonb) is
  'Enregistre un lead attribué (ad_leads) pour le formulaire public (exige le secret serveur).';

-- 8. Suivi des pubs ---------------------------------------------------------------------------------

-- Même logique que public.track_ad_event (session créée si nouvelle, puis
-- événement), avec le secret et des plafonds : au plus 300 événements par
-- session et 600 par minute au total ; au-delà, ignoré en silence.
create or replace function public.suivi_pub_enregistrer(
  p_secret text,
  p_session jsonb,
  p_type text,
  p_path text
)
returns void
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_sid text;
  v_id uuid;
  v_platform text;
  v_device text;
begin
  if not securite.secret_valide(p_secret) then
    raise exception 'accès refusé' using errcode = '42501';
  end if;
  if p_type is null
     or p_type not in ('page_view', 'cta_click', 'form_view', 'form_start', 'form_submit') then
    return;
  end if;
  if p_session is null or jsonb_typeof(p_session) <> 'object' then
    return;
  end if;
  v_sid := p_session->>'id';
  if v_sid is null
     or v_sid !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    return;
  end if;
  v_id := v_sid::uuid;

  -- Plafond global : 600 événements par minute, toutes sessions confondues.
  if (select count(*) from (
        select 1 from public.ad_events e
        where e.created_at > now() - interval '1 minute'
        limit 600
      ) t) >= 600 then
    return;
  end if;
  -- Plafond par session : 300 événements.
  if (select count(*) from (
        select 1 from public.ad_events e
        where e.session_id = v_id
        limit 300
      ) t) >= 300 then
    return;
  end if;

  v_platform := p_session->>'platform';
  if v_platform is null
     or v_platform not in ('meta', 'google', 'organic', 'referral', 'direct', 'email', 'other') then
    v_platform := 'direct';
  end if;
  v_device := p_session->>'device';
  if v_device is not null and v_device not in ('mobile', 'tablet', 'desktop') then
    v_device := null;
  end if;

  insert into public.ad_sessions (
    id, platform, utm_source, utm_medium, utm_campaign, utm_content, utm_term,
    campaign_id, adset_id, ad_id, placement, fbclid, gclid, landing_path, referrer, device, locale
  )
  values (
    v_id,
    v_platform,
    nullif(left(btrim(p_session->>'utm_source'), 200), ''),
    nullif(left(btrim(p_session->>'utm_medium'), 200), ''),
    nullif(left(btrim(p_session->>'utm_campaign'), 300), ''),
    nullif(left(btrim(p_session->>'utm_content'), 300), ''),
    nullif(left(btrim(p_session->>'utm_term'), 300), ''),
    nullif(left(btrim(p_session->>'campaign_id'), 100), ''),
    nullif(left(btrim(p_session->>'adset_id'), 100), ''),
    nullif(left(btrim(p_session->>'ad_id'), 100), ''),
    nullif(left(btrim(p_session->>'placement'), 100), ''),
    nullif(left(btrim(p_session->>'fbclid'), 500), ''),
    nullif(left(btrim(p_session->>'gclid'), 500), ''),
    nullif(left(btrim(p_session->>'landing_path'), 500), ''),
    nullif(left(btrim(p_session->>'referrer'), 500), ''),
    v_device,
    case when p_session->>'locale' = 'en' then 'en' else 'fr' end
  )
  on conflict (id) do nothing;

  insert into public.ad_events (session_id, type, path)
  values (v_id, p_type, left(p_path, 500));
end;
$fn$;

revoke all on function public.suivi_pub_enregistrer(text, jsonb, text, text) from public;
grant execute on function public.suivi_pub_enregistrer(text, jsonb, text, text) to anon, authenticated;
comment on function public.suivi_pub_enregistrer(text, jsonb, text, text) is
  'Suivi des pubs (ad_sessions + ad_events) par le serveur (exige le secret serveur). Plafonds : 300 événements par session, 600 par minute.';

-- 9. Ménage horaire (pg_cron) ----------------------------------------------------------------------------

-- Aucune donnée sensible ni secret dans la commande. cron.schedule remplace la
-- tâche du même nom si elle existe (migration rejouable).
do $cron$
begin
  perform cron.schedule(
    'securite-menage-horaire',
    '17 * * * *',
    $cmd$delete from securite.limites where fenetre_debut < now() - interval '2 days'; delete from securite.journal where ts < now() - interval '90 days'$cmd$
  );
end;
$cron$;

-- Vérifier (lecture seule, sans afficher de secret) :
--   select count(*) as empreinte_posee from securite.secret_rpc;
--   select jobname, schedule, active from cron.job where jobname = 'securite-menage-horaire';
--   select evenement, count(*) from securite.journal where ts > now() - interval '1 day' group by 1;
