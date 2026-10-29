# Techno Lot — technolot.ca

Site vitrine Next.js 14 (App Router, Tailwind, Supabase) + dashboard admin + CRM de prospection. Rachat de lots informatiques au Québec. Tout le contenu utilisateur est en français (Québec).

## Commandes

- `npm run dev` — dev sur :3000 (préférer preview_start avec `.claude/launch.json`)
- `npm run build` — build + postbuild `scripts/inline-critical-css.mjs` (ne pas casser ce script, il corrige le LCP)
- `npx tsc --noEmit` — type-check (à lancer avant tout commit)

## Structure

- `app/(fr)` + `app/(en)/en` — site public bilingue (contenu dans `lib/i18n.ts`, `lib/site.ts`)
- `app/admin/(dashboard)` — dashboard admin : lots, soumissions (`/admin/soumissions`, `lib/admin/soumissions.ts`), calculatrice, CRM (`/admin/crm`, `/admin/crm/[id]`, `clients`, `relances`, `modeles`)
- `components/admin/` + `components/admin/crm/` — composants admin
- `lib/admin/` — types/actions/format des lots ; `lib/crm/` — types/actions/email/parse-followup-date du CRM
- Notifications : `/admin/notifications` + pastille du menu (`components/admin/notifications/`, `lib/admin/notifications.ts`) — fil calculé depuis `soumissions` (fonction `admin_soumissions`), `ad_leads` et `ebay_orders.first_seen_at` ; « vu » par admin dans `admin_notification_state` ; retraits par admin dans `admin_notification_dismissed` et `admin_notification_state.cleared_at` (« Tout effacer ») ; le provider lit toutes les 30 s (même onglet caché), lance la synchro eBay de fond chaque minute et déclenche son (`sons.ts`, Web Audio : cha-ching = vente eBay) + fenêtre en bas à droite (`NotificationsToasts`), un seul onglet sonnant grâce à `localStorage.tl_notif_alerte`
- Périodes et pages partagées : `lib/admin/periodes.ts` + `components/admin/PeriodeSelect.tsx` (paramètre `periode`), `lib/admin/pagination.ts` + `components/admin/Pagination.tsx`
- « Écrire » d'une soumission : pas de `mailto:` (ouvrait Outlook) ; `EcrireHostinger` copie l'adresse et ouvre le webmail Hostinger (`WEBMAIL_URL`, aucun lien ne pré-remplit un message)
- Auth : lien magique Supabase, whitelist `ADMIN_EMAILS` (.env.local), protégé par `middleware.ts` + layout. En local, impossible de se connecter (boîte info@technolot.ca) — pour vérifier visuellement, bypass temporaire dans middleware + layout marqué `TEMP-DEV-BYPASS`, à retirer avant commit.

## Supabase (projet aznelukkwitvttycwnjb)

- RLS : tables CRM = `authenticated` full access → les lectures anonymes renvoient vide (pages locales vides sans session : normal).
- Tables à NE JAMAIS modifier (schéma) : `soumissions`, `lots`, `email_logs`, `sales`. Le CRM peut seulement les lire/lier (`contacts.lot_id → lots.id`).
- Tables CRM modifiables : `companies` (fit_score 1-10, lead_status, next_followup_on, lead_status_changed_at), `contacts` (stage new→…→converted), `outreach_activities`, `email_templates`, `daily_prospect_batches`.
- `soumissions` n'a aucune politique de lecture : l'admin la lit via la fonction `admin_soumissions` (security definer, réservée aux courriels listés dans la fonction, à garder alignés sur `ADMIN_EMAILS`). La suppression passe par `admin_supprimer_soumission` (même liste de courriels ; supprime aussi le lead de pub `ad_leads` du même envoi ; le lot éventuel reste).
- Migrations DDL via l'outil MCP apply_migration.

## Règles CRM

- Envoi email : `lib/crm/email.ts` (Resend, signature Anthony Després, variables {{prenom}} {{nom}} {{compagnie}} {{titre}}, reply-to = admin connecté). Templates en base (`email_templates`), éditables via /admin/crm/modeles.
- Désabonnement (LCAP) : chaque courriel du CRM porte la mention « répondez désabonner » et l'en-tête `List-Unsubscribe` (boîte `CONTACT_EMAIL`). Bouton « Désabonner » sur la fiche contact → `contacts.unsubscribed_at` ; tout envoi (manuel ou `auto-relances`) est refusé vers une adresse désabonnée, même notée sur une autre fiche (`lib/crm/desabonnement.ts`).
- Rappels de suivi : date détectée dans la note (`parse-followup-date.ts`, fuseau America/Toronto) ou délai de statut (intéressé 3 j, contacté 7 j → `FOLLOWUP_DELAY_DAYS`).
- Conversion client : lot `source=manual, status=negotiating, purchase_price=0`, lie `contacts.lot_id`, compagnie → `research_status=converted`.

## Publicités (Meta / Google Ads)

- Tracking public : `lib/tracking/attribution.ts` (UTM, fbclid, gclid, ad_id… en localStorage `tl_attr`, 30 j) + `components/tracking/AdTracker.tsx` → `/api/track` → RPC SQL `track_ad_event` (SECURITY DEFINER : anon ne peut pas lire, donc pas d'upsert direct). Pixels Meta/Google chargés seulement si `NEXT_PUBLIC_*` présents.
- Leads attribués : `/api/soumission` insère aussi dans `ad_leads` (champ caché `tl_attr` du formulaire).
- Stats des plateformes : `lib/ads/meta.ts`, `google.ts`, `sync.ts` → `ad_metrics_daily` via POST `/api/admin/ads-sync` (admin connecté ou `Bearer CRON_SECRET` + `SUPABASE_SERVICE_ROLE_KEY`).
- Dashboard : `/admin/pubs` et `/admin/pubs/[platform]/[adId]`, agrégations pures dans `lib/ads/queries.ts`. Guide des clés : `docs/PUBLICITES-SETUP.md`.
- Constantes partagées serveur/client : jamais dans un fichier `"use client"` (ex. `lib/ads/platforms.ts`).

## Conventions

- Toujours répondre à l'utilisateur en français (Québec), même s'il écrit en anglais.

- Thème admin : fond `night-950`, cartes `.glass`, accent vert `#5ECB33` (`.btn-primary`, `.field` dans `app/globals.css`, couleurs dans `tailwind.config.ts`).
- Wording : jamais « paiement avant notre départ » ; dire « paiement rapide et garanti ».
- Git : messages de commit en français.
- Sessions Claude Code dans le nuage (claude.ai/code, branche imposée `claude/...`) : l'utilisateur veut que TOUS les changements aillent sur `dev`. Travailler sur `dev` (`git fetch origin dev && git checkout -B dev origin/dev`) et pousser sur `dev`, pas sur la branche `claude/...`. Vercel déploie une prévisualisation de `dev` automatiquement.
- Workflow multi-ordi : on travaille TOUJOURS sur la branche `dev` (en début de session : `git fetch origin && git checkout dev && git pull`). Commit + push sur `dev` librement après chaque modif terminée (sert à synchroniser les ordinateurs, ne déploie rien). Ne JAMAIS pousser sur `main` sauf si l'utilisateur dit « mets en ligne » : alors `git checkout main && git pull && git merge --ff-only dev && git push origin main`, puis revenir sur `dev`.
- Déploiement : Hostinger depuis GitHub. `.env.production` n'est PAS versionné (ignoré depuis `ba4aeb6`) : l'hébergeur doit fournir toutes les variables, y compris `NEXT_PUBLIC_SUPABASE_URL` et `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (intégrées au build) et `RESEND_API_KEY`. Preview Vercel de `dev` (techno-lot-dev.vercel.app) : variables dans Vercel → Environment Variables, environnement Preview ; sans les deux clés Supabase, le middleware plante sur /admin (500 MIDDLEWARE_INVOCATION_FAILED). `/api/track` n'enregistre rien en local ni sur les Preview (`VERCEL_ENV=preview`).
