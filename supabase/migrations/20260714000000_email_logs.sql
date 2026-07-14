-- ============================================================================
-- Table email_logs — suivi des courriels traités par le processeur IMAP
-- Évite de retraiter un même courriel deux fois.
-- ============================================================================

create table if not exists public.email_logs (
  id            uuid          primary key default gen_random_uuid(),
  processed_at  timestamptz   not null    default now(),
  message_id    text          not null    unique,
  subject       text,
  sender        text,
  received_at   timestamptz,
  status        text          not null    default 'processed'
                                          check (status in ('processed', 'skipped', 'error')),
  lot_id        uuid          references public.lots(id) on delete set null,
  raw_preview   text,
  error_message text,
  extracted     jsonb
);

create index if not exists email_logs_message_id_idx on public.email_logs (message_id);
create index if not exists email_logs_processed_at_idx on public.email_logs (processed_at desc);

alter table public.email_logs enable row level security;

create policy "authenticated_can_select_email_logs"
  on public.email_logs for select
  to authenticated
  using (true);

create policy "service_role_can_all_email_logs"
  on public.email_logs for all
  to service_role
  using (true)
  with check (true);
