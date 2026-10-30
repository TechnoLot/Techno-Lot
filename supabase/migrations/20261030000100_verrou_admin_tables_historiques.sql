-- Verrou admin, 2e partie : tables historiques lots, sales, email_logs.
--
-- Ces tables sont protégées par le CLAUDE.md (ne jamais changer leur schéma) :
-- cette migration ne touche QUE leurs politiques RLS, aucune colonne. À appliquer
-- seulement avec l'accord de l'utilisateur, après 20261030000000_verrou_admin_rls.sql
-- (qui crée public.admins et public.est_admin()).
--
-- Avant : tout compte « authenticated » (n'importe qui, inscriptions ouvertes)
-- pouvait lire/écrire lots et sales et lire email_logs. Après : seuls les comptes
-- de public.admins. Les fonctions Edge (process-emails, process-sales) et les
-- routes serveur qui utilisent la clé service_role ne sont pas touchées
-- (service_role contourne RLS ; les politiques service_role restent).
-- La table soumissions ne change pas (aucune lecture directe ; insertion anon
-- du formulaire public conservée).

do $$
begin
  if to_regprocedure('public.est_admin()') is null then
    raise exception 'Verrou admin (tables historiques) : appliquer d''abord 20261030000000_verrou_admin_rls.sql.';
  end if;
end;
$$;

-- lots : les 4 politiques « authenticated » (true) deviennent une seule, admin.
drop policy if exists "authenticated_can_select_lots" on public.lots;
drop policy if exists "authenticated_can_insert_lots" on public.lots;
drop policy if exists "authenticated_can_update_lots" on public.lots;
drop policy if exists "authenticated_can_delete_lots" on public.lots;
drop policy if exists "admins_tout" on public.lots;
create policy "admins_tout" on public.lots
  for all to authenticated
  using ((select public.est_admin()))
  with check ((select public.est_admin()));

-- sales : idem ; « service_role_can_all_sales » est conservée.
drop policy if exists "authenticated_can_select_sales" on public.sales;
drop policy if exists "authenticated_can_insert_sales" on public.sales;
drop policy if exists "authenticated_can_update_sales" on public.sales;
drop policy if exists "authenticated_can_delete_sales" on public.sales;
drop policy if exists "admins_tout" on public.sales;
create policy "admins_tout" on public.sales
  for all to authenticated
  using ((select public.est_admin()))
  with check ((select public.est_admin()));

-- email_logs : lecture seule pour les admins (les fonctions Edge écrivent avec
-- service_role) ; « service_role_can_all_email_logs » est conservée.
drop policy if exists "authenticated_can_select_email_logs" on public.email_logs;
drop policy if exists "admins_lecture" on public.email_logs;
create policy "admins_lecture" on public.email_logs
  for select to authenticated
  using ((select public.est_admin()));
