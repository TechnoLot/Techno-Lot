-- Récupéré de supabase_migrations.schema_migrations le 2026-10-30 (appliquée sans fichier).
-- Version en base : 20260716022041 · nom : contacts_lot_id_on_delete_set_null · texte identique aux instructions appliquées.
alter table public.contacts
  drop constraint contacts_lot_id_fkey,
  add constraint contacts_lot_id_fkey
    foreign key (lot_id) references public.lots(id) on delete set null;
