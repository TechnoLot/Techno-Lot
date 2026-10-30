-- ⚠ ORDRE D'APPLICATION — À APPLIQUER SEULEMENT APRÈS :
--   1. la mise en ligne (branche main) du code de la double authentification
--      (page /admin/auth/mfa, garde aal2) ;
--   2. l'activation de la double authentification par l'admin sur le site EN
--      LIGNE (code QR scanné, premier code accepté, puis connexion avec code).
-- Appliquée avant, l'admin du site en ligne ne voit plus RIEN : toutes les
-- tables admin répondent vide et les fonctions admin refusent (42501), car la
-- session sans code (aal1) n'est plus reconnue comme admin.
--
-- Double authentification exigée par la base (passe sécurité, 30 oct. 2026).
--
-- Pourquoi : décision du 30 oct. 2026 — l'admin exige un code d'application
-- d'authentification (TOTP Supabase, niveau aal2). Le code de l'application le
-- vérifie déjà (lib/securite/garde.ts, middleware.ts) ; la base doit aussi
-- refuser un jeton aal1 (mot de passe seul) utilisé directement contre l'API
-- REST avec la clé publishable (défense en profondeur).
--
-- Comment : public.est_admin(), utilisée par toutes les politiques et fonctions
-- admin, vérifie en plus la revendication `aal` du jeton. Même signature,
-- mêmes droits, `search_path` vide : rien d'autre ne change.
--
-- Retour arrière (urgence seulement, ex. facteur perdu sans accès au tableau de
-- bord Supabase) : réappliquer la définition de 20261030000000_verrou_admin_rls.sql :
--   create or replace function public.est_admin() returns boolean language sql
--   stable security definer set search_path = '' as $$
--     select exists (select 1 from public.admins a where a.user_id = (select auth.uid()));
--   $$;

create or replace function public.est_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.admins a where a.user_id = (select auth.uid()))
     and coalesce((select auth.jwt() ->> 'aal'), '') = 'aal2';
$$;

revoke execute on function public.est_admin() from public, anon;
grant execute on function public.est_admin() to authenticated, service_role;

comment on function public.est_admin() is
  'Vrai si le compte connecté (auth.uid()) est dans public.admins ET a fait la double authentification (jeton aal2). Utilisée par toutes les politiques admin.';
