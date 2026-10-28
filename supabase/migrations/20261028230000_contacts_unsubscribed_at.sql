-- Désabonnement des courriels de prospection (LCAP) : date à laquelle le
-- contact a demandé à ne plus recevoir de courriels. Non nulle = aucun envoi
-- (manuel ou relance automatique) vers son adresse, même depuis une autre fiche.
alter table public.contacts add column if not exists unsubscribed_at timestamptz;

comment on column public.contacts.unsubscribed_at is
  'Désabonnement des courriels (LCAP) : plus aucun courriel de prospection vers cette adresse.';
