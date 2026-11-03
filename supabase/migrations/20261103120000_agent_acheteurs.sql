-- Agent « Acheteurs » (onglet Soumissions, accueil, CRM → Acheteurs) : le
-- carnet des compagnies qui rachètent des lots en gros, et la recherche
-- d'acheteurs de chaque soumission. L'admin la demande ; l'agent de
-- l'ordinateur de l'utilisateur (scripts/agent-acheteurs) la prend par
-- /api/cron/acheteurs/prendre, fait chercher Claude, puis renvoie la réponse
-- par /api/cron/acheteurs/reponse. Rien ne change dans soumissions ni dans
-- lots : soumission_id n'a pas de clé étrangère, pour ne pas toucher à
-- admin_supprimer_soumission.

create table if not exists public.acheteurs (
  id uuid primary key default gen_random_uuid(),
  nom text not null check (char_length(nom) between 1 and 160),
  -- Domaine du site sans « www. » : une compagnie = une fiche.
  domaine text not null unique check (char_length(domaine) between 3 and 253),
  site text check (site is null or char_length(site) <= 500),
  ville text check (ville is null or char_length(ville) <= 80),
  region text check (region is null or char_length(region) <= 80),
  pays text check (pays is null or pays ~ '^[A-Z]{2}$'),
  categories text[] not null default '{}',
  modeles text[] not null default '{}',
  courriel text check (courriel is null or char_length(courriel) <= 254),
  telephone text check (telephone is null or char_length(telephone) <= 40),
  formulaire text check (formulaire is null or char_length(formulaire) <= 500),
  -- Pages qui prouvent que la compagnie vend l'article ou rachète du surplus.
  sources jsonb not null default '[]'::jsonb,
  confiance text not null default 'a_sonder' check (confiance in ('achete_surplus', 'a_sonder')),
  verifie boolean not null default false,
  notes text check (notes is null or char_length(notes) <= 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.recherches_acheteurs (
  id uuid primary key default gen_random_uuid(),
  soumission_id uuid not null unique,
  -- en_attente : demandée dans l'admin ; en_cours : prise par l'agent de
  -- l'ordinateur ; resultats : réponse lue ; echec : à relancer.
  statut text not null default 'en_attente'
    check (statut in ('en_attente', 'en_cours', 'resultats', 'echec')),
  articles jsonb not null default '[]'::jsonb,
  -- « Chercher d'autres acheteurs » : compagnies déjà trouvées, exclues de la
  -- demande ; les nouvelles s'ajoutent alors aux résultats au lieu de les remplacer.
  domaines_exclus text[] not null default '{}',
  -- { familles, courriels } lus par lib/acheteurs/reponse.ts (gardés pendant
  -- une nouvelle recherche)
  resultats jsonb,
  lignes_refusees integer not null default 0 check (lignes_refusees >= 0),
  -- Message affiché à l'admin, jamais de détail technique
  erreur text check (erreur is null or char_length(erreur) <= 300),
  demande_le timestamptz not null default now(),
  -- Prise par l'agent : une réponse qui ne porte pas le jeton de la prise en
  -- cours (recherche annulée, relancée ou reprise) est ignorée.
  pris_le timestamptz,
  jeton uuid,
  resultats_le timestamptz,
  lance_par uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists acheteurs_created_at_idx on public.acheteurs (created_at desc);
create index if not exists recherches_acheteurs_file_idx on public.recherches_acheteurs (statut, demande_le);

drop trigger if exists acheteurs_set_updated_at on public.acheteurs;
create trigger acheteurs_set_updated_at
  before update on public.acheteurs
  for each row execute function public.set_updated_at();

drop trigger if exists recherches_acheteurs_set_updated_at on public.recherches_acheteurs;
create trigger recherches_acheteurs_set_updated_at
  before update on public.recherches_acheteurs
  for each row execute function public.set_updated_at();

alter table public.acheteurs enable row level security;
alter table public.recherches_acheteurs enable row level security;

drop policy if exists "admins_acheteurs" on public.acheteurs;
create policy "admins_acheteurs" on public.acheteurs
  for all to authenticated
  using ((select public.est_admin()))
  with check ((select public.est_admin()));

drop policy if exists "admins_recherches_acheteurs" on public.recherches_acheteurs;
create policy "admins_recherches_acheteurs" on public.recherches_acheteurs
  for all to authenticated
  using ((select public.est_admin()))
  with check ((select public.est_admin()));

-- Second mur (20261030040100_droits_anon_reduits.sql) : aucun droit pour anon.
revoke all on public.acheteurs, public.recherches_acheteurs from anon;

comment on table public.acheteurs is
  'Carnet des compagnies qui rachètent des lots en gros (agent Acheteurs : CRM → Acheteurs).';
comment on table public.recherches_acheteurs is
  'Recherche d''acheteurs d''une soumission : demande de l''admin, prise par l''agent de son ordinateur, résultats lus.';
