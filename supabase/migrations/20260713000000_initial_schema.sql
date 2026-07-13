-- ============================================================================
-- Techno Lot — schéma initial Supabase
--
-- À exécuter dans le SQL Editor du dashboard Supabase (ou via `supabase db
-- query` en local). Idempotent : peut être ré-exécuté sans erreur.
-- ============================================================================

-- Table des soumissions envoyées via le formulaire de contact.
create table if not exists public.soumissions (
  id          uuid          primary key default gen_random_uuid(),
  created_at  timestamptz   not null    default now(),
  nom         text          not null,
  courriel    text          not null,
  telephone   text          not null,
  message     text,
  locale      text          not null    default 'fr' check (locale in ('fr','en')),
  fichiers    text[]        not null    default '{}'
);

-- Index utile pour trier les soumissions récentes dans un futur tableau de bord.
create index if not exists soumissions_created_at_idx
  on public.soumissions (created_at desc);

-- RLS obligatoire : la table est dans un schéma exposé (public) et accessible
-- via l'API Data avec la clé publishable. Sans RLS, tout serait ouvert.
alter table public.soumissions enable row level security;

-- Politique : autoriser les visiteurs anonymes à INSÉRER une soumission,
-- mais pas à en lire, mettre à jour ou supprimer. Le contenu reste privé,
-- accessible uniquement via le service role (dashboard, admin futur).
drop policy if exists "anon_can_insert_soumissions" on public.soumissions;
create policy "anon_can_insert_soumissions"
  on public.soumissions
  for insert
  to anon
  with check (true);
