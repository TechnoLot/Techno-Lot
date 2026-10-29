-- Onglet « Destruction des données » (groupe eBay de l'admin) : registre des
-- certificats de destruction des données remis aux clients. Le PDF et la photo
-- se génèrent dans le navigateur à partir de ces valeurs ; le registre donne le
-- prochain numéro (TL-AAAA-NNNN) et permet de retélécharger un certificat.
create table if not exists public.certificats_destruction (
  id uuid primary key default gen_random_uuid(),
  numero text not null unique check (char_length(numero) between 1 and 40),
  compagnie text not null check (char_length(compagnie) between 1 and 160),
  adresse text check (adresse is null or char_length(adresse) <= 200),
  materiel text check (materiel is null or char_length(materiel) <= 200),
  nb_appareils integer not null check (nb_appareils between 1 and 100000),
  date_destruction date not null,
  date_emission date not null default current_date,
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists certificats_destruction_created_at_idx
  on public.certificats_destruction (created_at desc);

alter table public.certificats_destruction enable row level security;

-- Réservé aux comptes admin : même liste que admin_soumissions, à garder
-- alignée sur ADMIN_EMAILS (variable du serveur).
drop policy if exists "admins_certificats_destruction" on public.certificats_destruction;
create policy "admins_certificats_destruction" on public.certificats_destruction
  for all to authenticated
  using (lower(coalesce((select auth.jwt()) ->> 'email', '')) = any (array['info@technolot.ca']))
  with check (lower(coalesce((select auth.jwt()) ->> 'email', '')) = any (array['info@technolot.ca']));

comment on table public.certificats_destruction is
  'Certificats de destruction des données remis aux clients (admin → eBay → Destruction des données).';
