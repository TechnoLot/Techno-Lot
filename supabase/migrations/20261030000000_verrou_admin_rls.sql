-- Verrou admin de la base (passe sécurité, 30 oct. 2026).
--
-- Pourquoi : les inscriptions Supabase Auth étaient ouvertes avec confirmation
-- automatique (disable_signup = false, mailer_autoconfirm = true). N'importe qui
-- pouvait donc se créer un compte confirmé avec la clé publishable (publique par
-- nature) et, avec les anciennes politiques « authenticated » + true, lire,
-- modifier ou supprimer les données du CRM, des pubs, d'eBay, etc. par l'API REST.
-- Désactiver les inscriptions ne suffit pas : la base doit elle-même refuser tout
-- compte qui n'est pas admin (défense en profondeur).
--
-- Comment : la liste des admins vit dans la table public.admins (aucune
-- politique, aucun droit pour anon/authenticated : personne ne peut s'y ajouter
-- par l'API). La fonction public.est_admin() la consulte pour auth.uid() ; toutes
-- les politiques et fonctions admin passent par elle.
--
-- Ajouter un admin :
--   1. insert into public.admins (user_id, note)
--        select id, 'Prénom Nom' from auth.users where lower(email) = 'courriel@exemple.ca';
--      (dans l'éditeur SQL de Supabase ou par une migration) ;
--   2. ajouter le même courriel à ADMIN_EMAILS côté application (variables du
--      serveur), sinon le middleware et le layout de /admin le refusent.
-- Retirer un admin : delete from public.admins where user_id = '…' + ADMIN_EMAILS.
--
-- Les politiques « anon_insert » (ad_events, ad_leads, ad_sessions) et
-- « anon_can_insert_soumissions » ne sont pas touchées ici.

-- 1. Liste des admins -----------------------------------------------------------

create table if not exists public.admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  ajoute_le timestamptz not null default now(),
  note text
);

alter table public.admins enable row level security;
-- Aucune politique : seuls le propriétaire (postgres), service_role et les
-- fonctions SECURITY DEFINER y accèdent.
revoke all on public.admins from anon, authenticated;

comment on table public.admins is
  'Comptes Auth autorisés dans /admin. Garder aligné sur ADMIN_EMAILS (serveur). Aucune politique : non modifiable par l''API.';

insert into public.admins (user_id, note)
select u.id, 'Compte principal info@technolot.ca'
from auth.users u
where lower(u.email) = 'info@technolot.ca'
on conflict (user_id) do nothing;

do $$
begin
  if not exists (
    select 1
    from public.admins a
    join auth.users u on u.id = a.user_id
    where lower(u.email) = 'info@technolot.ca'
  ) then
    raise exception 'Verrou admin : aucun compte Auth info@technolot.ca, migration annulée (sinon plus personne n''aurait accès à l''admin).';
  end if;
end;
$$;

-- 2. Test « est-ce un admin ? » -------------------------------------------------

create or replace function public.est_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.admins a where a.user_id = (select auth.uid()));
$$;

revoke execute on function public.est_admin() from public, anon;
grant execute on function public.est_admin() to authenticated, service_role;

comment on function public.est_admin() is
  'Vrai si le compte connecté (auth.uid()) est dans public.admins. Utilisée par toutes les politiques admin.';

-- 3. Tables de l'admin : accès complet réservé aux admins -----------------------

drop policy if exists "authenticated_full_access" on public.companies;
drop policy if exists "admins_tout" on public.companies;
create policy "admins_tout" on public.companies
  for all to authenticated
  using ((select public.est_admin()))
  with check ((select public.est_admin()));

drop policy if exists "authenticated_full_access" on public.contacts;
drop policy if exists "admins_tout" on public.contacts;
create policy "admins_tout" on public.contacts
  for all to authenticated
  using ((select public.est_admin()))
  with check ((select public.est_admin()));

drop policy if exists "authenticated_full_access" on public.outreach_activities;
drop policy if exists "admins_tout" on public.outreach_activities;
create policy "admins_tout" on public.outreach_activities
  for all to authenticated
  using ((select public.est_admin()))
  with check ((select public.est_admin()));

drop policy if exists "authenticated_full_access" on public.email_templates;
drop policy if exists "admins_tout" on public.email_templates;
create policy "admins_tout" on public.email_templates
  for all to authenticated
  using ((select public.est_admin()))
  with check ((select public.est_admin()));

drop policy if exists "authenticated_full_access" on public.daily_prospect_batches;
drop policy if exists "admins_tout" on public.daily_prospect_batches;
create policy "admins_tout" on public.daily_prospect_batches
  for all to authenticated
  using ((select public.est_admin()))
  with check ((select public.est_admin()));

drop policy if exists "authenticated_full_access" on public.ad_metrics_daily;
drop policy if exists "admins_tout" on public.ad_metrics_daily;
create policy "admins_tout" on public.ad_metrics_daily
  for all to authenticated
  using ((select public.est_admin()))
  with check ((select public.est_admin()));

drop policy if exists "authenticated_full_access" on public.ad_sync_runs;
drop policy if exists "admins_tout" on public.ad_sync_runs;
create policy "admins_tout" on public.ad_sync_runs
  for all to authenticated
  using ((select public.est_admin()))
  with check ((select public.est_admin()));

drop policy if exists "authenticated_full_access" on public.ebay_orders;
drop policy if exists "admins_tout" on public.ebay_orders;
create policy "admins_tout" on public.ebay_orders
  for all to authenticated
  using ((select public.est_admin()))
  with check ((select public.est_admin()));

drop policy if exists "authenticated_full_access" on public.ebay_sync_runs;
drop policy if exists "admins_tout" on public.ebay_sync_runs;
create policy "admins_tout" on public.ebay_sync_runs
  for all to authenticated
  using ((select public.est_admin()))
  with check ((select public.est_admin()));

drop policy if exists "saved_lots_authenticated_all" on public.saved_lots;
drop policy if exists "authenticated_full_access" on public.saved_lots;
drop policy if exists "admins_tout" on public.saved_lots;
create policy "admins_tout" on public.saved_lots
  for all to authenticated
  using ((select public.est_admin()))
  with check ((select public.est_admin()));

-- Tables du suivi publicitaire : « anon_insert » reste en place (formulaire
-- public et /api/track) ; seule la politique « authenticated » change.
drop policy if exists "authenticated_full_access" on public.ad_events;
drop policy if exists "admins_tout" on public.ad_events;
create policy "admins_tout" on public.ad_events
  for all to authenticated
  using ((select public.est_admin()))
  with check ((select public.est_admin()));

drop policy if exists "authenticated_full_access" on public.ad_leads;
drop policy if exists "admins_tout" on public.ad_leads;
create policy "admins_tout" on public.ad_leads
  for all to authenticated
  using ((select public.est_admin()))
  with check ((select public.est_admin()));

drop policy if exists "authenticated_full_access" on public.ad_sessions;
drop policy if exists "admins_tout" on public.ad_sessions;
create policy "admins_tout" on public.ad_sessions
  for all to authenticated
  using ((select public.est_admin()))
  with check ((select public.est_admin()));

-- 4. Notifications : chaque admin ne voit que son propre état -------------------

alter policy "own_notification_state" on public.admin_notification_state
  to authenticated
  using (user_id = (select auth.uid()) and (select public.est_admin()))
  with check (user_id = (select auth.uid()) and (select public.est_admin()));

alter policy "own_notification_dismissed" on public.admin_notification_dismissed
  to authenticated
  using (user_id = (select auth.uid()) and (select public.est_admin()))
  with check (user_id = (select auth.uid()) and (select public.est_admin()));

-- 5. Certificats de destruction : la liste de courriels devient est_admin() -----

alter policy "admins_certificats_destruction" on public.certificats_destruction
  to authenticated
  using ((select public.est_admin()))
  with check ((select public.est_admin()));

alter policy "admins_certificats_compteurs" on public.certificats_destruction_compteurs
  to authenticated
  using ((select public.est_admin()))
  with check ((select public.est_admin()));

-- 6. Fonctions admin sur les soumissions : même signature, contrôle par table ---

create or replace function public.admin_soumissions(
  p_since timestamptz default null,
  p_limit integer default 500,
  p_id uuid default null
)
returns setof public.soumissions
language plpgsql
stable
security definer
set search_path = public
as $function$
begin
  if not public.est_admin() then
    raise exception 'Accès réservé aux administrateurs' using errcode = '42501';
  end if;

  return query
    select s.*
    from public.soumissions s
    where (p_since is null or s."DATE" >= p_since)
      and (p_id is null or s.id = p_id)
    order by s."DATE" desc
    limit least(greatest(coalesce(p_limit, 500), 1), 1000);
end;
$function$;

create or replace function public.admin_supprimer_soumission(p_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_soumission public.soumissions;
begin
  if not public.est_admin() then
    raise exception 'Accès réservé aux administrateurs' using errcode = '42501';
  end if;

  delete from public.soumissions
  where id = p_id
  returning * into v_soumission;

  if not found then
    return false;
  end if;

  -- Lead de pub enregistré par le même envoi du formulaire (même courriel,
  -- quelques secondes d'écart) : il ne doit plus compter dans les pubs.
  if nullif(trim(v_soumission.courriel), '') is not null then
    delete from public.ad_leads
    where id = (
      select l.id
      from public.ad_leads l
      where lower(trim(l.courriel)) = lower(trim(v_soumission.courriel))
        and abs(extract(epoch from (l.created_at - v_soumission."DATE"))) <= 600
      order by abs(extract(epoch from (l.created_at - v_soumission."DATE")))
      limit 1
    );
  end if;

  return true;
end;
$function$;

-- Nombre de formulaires reçus (tableau de bord des pubs) : n'était contrôlé par
-- rien d'autre que le rôle « authenticated ». En cas de refus, l'app affiche
-- « n'a pas pu être lu » (lib/ads/queries.ts, siteForms = null).
create or replace function public.soumissions_count(p_from timestamptz, p_to timestamptz)
returns integer
language plpgsql
stable
security definer
set search_path = public
as $function$
begin
  if not public.est_admin() then
    raise exception 'Accès réservé aux administrateurs' using errcode = '42501';
  end if;

  return (
    select count(*)::integer
    from public.soumissions
    where "DATE" >= p_from and "DATE" < p_to
  );
end;
$function$;

-- 7. Durcissements signalés par les conseils Supabase ---------------------------

-- Déclencheur updated_at : n'utilise que now() (pg_catalog).
alter function public.set_updated_at() set search_path = '';

-- Suivi publicitaire (appelé par anon via /api/track) : borne device et locale
-- comme les autres champs (les contraintes CHECK de ad_sessions limitent déjà
-- leurs valeurs à mobile/tablet/desktop et fr/en) ; le reste est inchangé.
create or replace function public.track_ad_event(p_session jsonb, p_type text, p_path text)
returns void
language plpgsql
security definer
set search_path = public
as $function$
begin
  if p_type not in ('page_view','cta_click','form_view','form_start','form_submit') then
    return;
  end if;

  insert into ad_sessions (id, platform, utm_source, utm_medium, utm_campaign, utm_content, utm_term,
    campaign_id, adset_id, ad_id, placement, fbclid, gclid, landing_path, referrer, device, locale)
  values (
    (p_session->>'id')::uuid,
    coalesce(p_session->>'platform', 'direct'),
    left(p_session->>'utm_source', 200), left(p_session->>'utm_medium', 200),
    left(p_session->>'utm_campaign', 300), left(p_session->>'utm_content', 300),
    left(p_session->>'utm_term', 300),
    left(p_session->>'campaign_id', 100), left(p_session->>'adset_id', 100),
    left(p_session->>'ad_id', 100), left(p_session->>'placement', 100),
    left(p_session->>'fbclid', 500), left(p_session->>'gclid', 500),
    left(p_session->>'landing_path', 500), left(p_session->>'referrer', 500),
    left(p_session->>'device', 50), left(p_session->>'locale', 50)
  )
  on conflict (id) do nothing;

  insert into ad_events (session_id, type, path)
  values ((p_session->>'id')::uuid, p_type, left(p_path, 500));
end;
$function$;
