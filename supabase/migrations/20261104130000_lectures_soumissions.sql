-- Agent « Acheteurs » : lecture automatique des pièces jointes des soumissions
-- (les fichiers ne sont pas en base : ils partent seulement par courriel à
-- info@). L'agent de l'ordinateur de l'utilisateur (scripts/agent-acheteurs)
-- prend une soumission par /api/cron/acheteurs/lecture/prendre, télécharge
-- photos et PDF par /lecture/piece, fait lire Claude sans aucun outil, puis
-- renvoie sa réponse par /lecture/reponse. Le résultat n'est qu'une liste
-- proposée à l'admin. Rien ne change dans soumissions ni dans lots :
-- soumission_id n'a pas de clé étrangère, pour ne pas toucher à
-- admin_supprimer_soumission (lib/admin/soumissions-actions.ts retire la ligne).

create table if not exists public.lectures_soumissions (
  id uuid primary key default gen_random_uuid(),
  soumission_id uuid not null unique,
  -- en_attente : détectée ou relue ; en_cours : prise par l'agent de
  -- l'ordinateur ; lue : liste prête ; echec : à relire.
  statut text not null default 'en_attente'
    check (statut in ('en_attente', 'en_cours', 'lue', 'echec')),
  -- ArticleLu[] lus par lib/acheteurs/pieces.ts (gardés pendant une relecture)
  articles jsonb not null default '[]'::jsonb,
  articles_ignores integer not null default 0 check (articles_ignores >= 0),
  -- PieceLue[] : pièces du courriel, classées, avec la raison de celles qui
  -- n'ont pas été lues
  pieces jsonb not null default '[]'::jsonb,
  -- { dossier, uid } du courriel, gardé pour la prise en cours seulement
  courriel jsonb,
  -- Message affiché à l'admin, jamais de détail technique
  erreur text check (erreur is null or char_length(erreur) <= 300),
  demande_le timestamptz not null default now(),
  -- Prise par l'agent : une réponse qui ne porte pas le jeton de la prise en
  -- cours (lecture relancée ou reprise) est ignorée.
  pris_le timestamptz,
  jeton uuid,
  lue_le timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists lectures_soumissions_file_idx on public.lectures_soumissions (statut, demande_le);

drop trigger if exists lectures_soumissions_set_updated_at on public.lectures_soumissions;
create trigger lectures_soumissions_set_updated_at
  before update on public.lectures_soumissions
  for each row execute function public.set_updated_at();

alter table public.lectures_soumissions enable row level security;

drop policy if exists "admins_lectures_soumissions" on public.lectures_soumissions;
create policy "admins_lectures_soumissions" on public.lectures_soumissions
  for all to authenticated
  using ((select public.est_admin()))
  with check ((select public.est_admin()));

-- Second mur (20261030040100_droits_anon_reduits.sql) : aucun droit pour anon.
revoke all on public.lectures_soumissions from anon;

comment on table public.lectures_soumissions is
  'Lecture des pièces jointes d''une soumission : prise par l''agent de l''ordinateur de l''utilisateur, liste d''articles proposée à l''admin.';
