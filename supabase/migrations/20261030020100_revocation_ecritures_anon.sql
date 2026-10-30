-- À appliquer SEULEMENT après la mise en ligne du code qui utilise les fonctions
-- à secret, sinon le formulaire du site en ligne casse.
--
-- Révocation des écritures publiques directes (passe sécurité, 30 oct. 2026).
--
-- Pourquoi : décision du 30 oct. 2026 — plus aucune écriture directe du rôle
-- anon dans soumissions, ad_leads, ad_events, ad_sessions ni par
-- track_ad_event. Le serveur passe désormais par les fonctions à secret de
-- 20261030020000_securite_rpc.sql (soumission_enregistrer, lead_pub_enregistrer,
-- suivi_pub_enregistrer).
--
-- Prérequis, dans l'ordre :
--   1. 20261030020000_securite_rpc.sql appliquée ;
--   2. empreinte de SECURITE_RPC_SECRET posée dans securite.secret_rpc ;
--   3. SECURITE_RPC_SECRET défini chez l'hébergeur ET code (branche main) en ligne
--      qui appelle les fonctions à secret — vérifier une vraie soumission.
--
-- Seule la règle d'accès change : aucune colonne de soumissions n'est touchée.
-- Retour arrière (urgence seulement) : recréer les politiques supprimées, ex.
--   create policy "anon_can_insert_soumissions" on public.soumissions
--     for insert to anon with check (true);
--   grant execute on function public.track_ad_event(jsonb, text, text) to anon, authenticated;

drop policy if exists "anon_insert" on public.ad_events;
drop policy if exists "anon_insert" on public.ad_leads;
drop policy if exists "anon_insert" on public.ad_sessions;
drop policy if exists "anon_can_insert_soumissions" on public.soumissions;

revoke execute on function public.track_ad_event(jsonb, text, text) from public, anon, authenticated;

-- Vérifier (lecture seule) :
--   select tablename, policyname, roles from pg_policies
--    where schemaname = 'public' and 'anon' = any(roles);            -- aucune ligne attendue pour ces 4 tables
--   select has_function_privilege('anon', 'public.track_ad_event(jsonb, text, text)', 'execute');  -- false
