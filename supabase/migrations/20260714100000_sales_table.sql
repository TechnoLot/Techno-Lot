-- Table sales : factures de ventes envoyées à des acheteurs
create table if not exists public.sales (
  id            uuid          primary key default gen_random_uuid(),
  created_at    timestamptz   not null    default now(),
  updated_at    timestamptz   not null    default now(),

  -- Acheteur (à qui on vend)
  buyer_name    text          not null,
  buyer_email   text,

  -- Financier (avant taxes)
  sale_price    numeric(12,2) not null    check (sale_price >= 0),

  sold_at       date          not null    default current_date,

  description   text,
  notes         text,

  source        text          not null    default 'email'
                                          check (source in ('manual', 'email'))
);

drop trigger if exists set_sales_updated_at on public.sales;
create trigger set_sales_updated_at
  before update on public.sales
  for each row
  execute function public.set_updated_at();

create index if not exists sales_sold_at_idx on public.sales (sold_at desc);
create index if not exists sales_buyer_name_idx on public.sales (lower(buyer_name));

alter table public.sales enable row level security;

create policy "authenticated_can_select_sales"
  on public.sales for select
  to authenticated
  using (true);

create policy "authenticated_can_insert_sales"
  on public.sales for insert
  to authenticated
  with check (true);

create policy "authenticated_can_update_sales"
  on public.sales for update
  to authenticated
  using (true) with check (true);

create policy "authenticated_can_delete_sales"
  on public.sales for delete
  to authenticated
  using (true);

create policy "service_role_can_all_sales"
  on public.sales for all
  to service_role
  using (true) with check (true);
