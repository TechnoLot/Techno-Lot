-- Récupéré de supabase_migrations.schema_migrations le 2026-10-30 (appliquée sans fichier).
-- Version en base : 20260803183136 · nom : create_saved_lots · texte identique aux instructions appliquées.

CREATE TABLE public.saved_lots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  name text NOT NULL,
  data jsonb NOT NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by_email text
);

CREATE INDEX saved_lots_updated_at_idx ON public.saved_lots (updated_at DESC);
CREATE UNIQUE INDEX saved_lots_name_key ON public.saved_lots (lower(name));

ALTER TABLE public.saved_lots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "saved_lots_authenticated_all"
  ON public.saved_lots
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
