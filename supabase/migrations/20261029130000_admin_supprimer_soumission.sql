-- Suppression d'une soumission depuis le tableau de bord admin, sans clé de
-- service. La table soumissions garde sa seule politique (insertion anonyme
-- du formulaire) ; même contrôle d'accès que admin_soumissions, liste à
-- garder alignée sur ADMIN_EMAILS. Le lot éventuel reste
-- (lots.soumission_id passe à null, ON DELETE SET NULL).
create or replace function public.admin_supprimer_soumission(p_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_soumission public.soumissions;
begin
  if lower(coalesce(auth.jwt() ->> 'email', '')) <> all (array['info@technolot.ca']) then
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
$$;

comment on function public.admin_supprimer_soumission(uuid) is
  'Supprime une soumission (admin seulement) et le lead de pub du même envoi (même courriel, 10 min ou moins). Le lot éventuel reste.';

revoke all on function public.admin_supprimer_soumission(uuid) from public, anon;
grant execute on function public.admin_supprimer_soumission(uuid) to authenticated;
