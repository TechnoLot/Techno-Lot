-- Récupéré de supabase_migrations.schema_migrations le 2026-10-30 (appliquée sans fichier).
-- Version en base : 20260803170428 · nom : add_cold_outreach_template_type · texte identique aux instructions appliquées
-- (gabarit de courriel d'affaires conservé : aucune donnée personnelle, seulement des variables {{...}}).

ALTER TABLE public.email_templates
  DROP CONSTRAINT email_templates_template_type_check;

ALTER TABLE public.email_templates
  ADD CONSTRAINT email_templates_template_type_check
  CHECK (template_type = ANY (ARRAY[
    'post_call_intro'::text,
    'cold_outreach'::text,
    'followup_1'::text,
    'followup_2'::text,
    'followup_3'::text
  ]));

INSERT INTO public.email_templates (name, template_type, subject, body, is_active)
VALUES (
  'Cold outreach — offre paiement + destruction',
  'cold_outreach',
  'On paie pour votre matériel informatique en fin de vie — {{compagnie}}',
  E'Bonjour {{prenom}},\n\nJe vous contacte parce que la plupart des entreprises comme {{compagnie}} recyclent gratuitement leur matériel informatique en fin de vie (postes, portables, serveurs, écrans, périphériques).\n\nChez Techno Lot, on va plus loin : on paie pour ce même matériel, on s''occupe du ramassage sur place partout au Québec, et on fournit un certificat de destruction des données TOTALEMENT SANS FRAIS.\n\nConcrètement :\n\n• Paiement rapide et garanti pour votre lot (portables, tours, serveurs, moniteurs, réseau…)\n• Ramassage sur place, sans manutention pour votre équipe\n• Certificat de destruction sécurisée des données, inclus\n• Reçu et traçabilité pour votre dossier ESG / conformité\n\nSi vous avez présentement du matériel qui traîne ou un cycle de remplacement prévu, dites-moi le volume approximatif (ex. : 20 portables + 5 serveurs) et je vous reviens avec une offre chiffrée dans la journée.\n\nMerci et bonne journée,',
  true
)
ON CONFLICT (name) DO NOTHING;
