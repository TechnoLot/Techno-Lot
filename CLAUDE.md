# Techno Lot — technolot.ca

Site vitrine Next.js 14 (App Router, Tailwind, Supabase) + dashboard admin + CRM de prospection. Rachat de lots informatiques au Québec. Tout le contenu utilisateur est en français (Québec).

## Commandes

- `npm run dev` — dev sur :3000 (préférer preview_start avec `.claude/launch.json`)
- `npm run build` — build + postbuild `scripts/inline-critical-css.mjs` (ne pas casser ce script, il corrige le LCP)
- `npx tsc --noEmit` — type-check (à lancer avant tout commit)

## Structure

- `app/(fr)` + `app/(en)/en` — site public bilingue (contenu dans `lib/i18n.ts`, `lib/site.ts`)
- `app/admin/(dashboard)` — dashboard admin : lots, calculatrice, CRM (`/admin/crm`, `/admin/crm/[id]`, `clients`, `relances`, `modeles`)
- `components/admin/` + `components/admin/crm/` — composants admin
- `lib/admin/` — types/actions/format des lots ; `lib/crm/` — types/actions/email/parse-followup-date du CRM
- Auth : lien magique Supabase, whitelist `ADMIN_EMAILS` (.env.local), protégé par `middleware.ts` + layout. En local, impossible de se connecter (boîte info@technolot.ca) — pour vérifier visuellement, bypass temporaire dans middleware + layout marqué `TEMP-DEV-BYPASS`, à retirer avant commit.

## Supabase (projet aznelukkwitvttycwnjb)

- RLS : tables CRM = `authenticated` full access → les lectures anonymes renvoient vide (pages locales vides sans session : normal).
- Tables à NE JAMAIS modifier (schéma) : `soumissions`, `lots`, `email_logs`, `sales`. Le CRM peut seulement les lire/lier (`contacts.lot_id → lots.id`).
- Tables CRM modifiables : `companies` (fit_score 1-10, lead_status, next_followup_on, lead_status_changed_at), `contacts` (stage new→…→converted), `outreach_activities`, `email_templates`, `daily_prospect_batches`.
- Migrations DDL via l'outil MCP apply_migration.

## Règles CRM

- Envoi email : `lib/crm/email.ts` (Resend, signature Eric Després, variables {{prenom}} {{nom}} {{compagnie}} {{titre}}, reply-to = admin connecté). Templates en base (`email_templates`), éditables via /admin/crm/modeles.
- Rappels de suivi : date détectée dans la note (`parse-followup-date.ts`, fuseau America/Toronto) ou délai de statut (intéressé 3 j, contacté 7 j → `FOLLOWUP_DELAY_DAYS`).
- Conversion client : lot `source=manual, status=negotiating, purchase_price=0`, lie `contacts.lot_id`, compagnie → `research_status=converted`.

## Conventions

- Thème admin : fond `night-950`, cartes `.glass`, accent vert `#5ECB33` (`.btn-primary`, `.field` dans `app/globals.css`, couleurs dans `tailwind.config.ts`).
- Wording : jamais « paiement avant notre départ » ; dire « paiement rapide et garanti ».
- Git : commit local ok ; ne pousser sur GitHub que sur demande explicite. Messages de commit en français.
- Déploiement : Hostinger depuis GitHub. `RESEND_API_KEY` doit exister côté serveur (pas dans `.env.production`, qui est versionné).
