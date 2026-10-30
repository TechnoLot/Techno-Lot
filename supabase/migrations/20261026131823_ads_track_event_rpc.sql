-- Récupéré de supabase_migrations.schema_migrations le 2026-10-30 (appliquée sans fichier).
-- Version en base : 20261026131823 · nom : ads_track_event_rpc · texte identique aux instructions appliquées.
-- Enregistre une session (si nouvelle) + un événement. SECURITY DEFINER car
-- l'upsert « on conflict do nothing » exige un droit de lecture que anon n'a pas.
create or replace function public.track_ad_event(p_session jsonb, p_type text, p_path text)
returns void
language plpgsql
security definer
set search_path = public
as $$
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
    p_session->>'device', p_session->>'locale'
  )
  on conflict (id) do nothing;

  insert into ad_events (session_id, type, path)
  values ((p_session->>'id')::uuid, p_type, left(p_path, 500));
end;
$$;

revoke all on function public.track_ad_event(jsonb, text, text) from public;
grant execute on function public.track_ad_event(jsonb, text, text) to anon, authenticated;
