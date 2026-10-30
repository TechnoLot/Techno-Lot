# Techno Lot — technolot.ca

Site vitrine Next.js 15 (App Router, Tailwind, Supabase) + dashboard admin + CRM de prospection. Rachat de lots informatiques au Québec. Tout le contenu utilisateur est en français (Québec).

## Commandes

- `npm run dev` — dev sur :3000 (préférer preview_start avec `.claude/launch.json`)
- `npm run build` — build + postbuild `scripts/inline-critical-css.mjs` (ne pas casser ce script, il corrige le LCP)
- `npx tsc --noEmit` + `npm test` (vitest) — à lancer avant tout commit ; `node scripts/verif-garde-admin.mjs` si une route/page/action admin change

## Structure

- `app/(fr)` + `app/(en)/en` — site public bilingue (contenu dans `lib/i18n.ts`, `lib/site.ts`)
- `app/admin/(dashboard)` — dashboard admin : lots, soumissions (`/admin/soumissions`, `lib/admin/soumissions.ts`), calculatrice, CRM (`/admin/crm`, `/admin/crm/[id]`, `clients`, `relances`, `modeles`)
- `components/admin/` + `components/admin/crm/` — composants admin
- `lib/admin/` — types/actions/format des lots ; `lib/crm/` — types/actions/email/parse-followup-date du CRM
- Notifications : `/admin/notifications` + pastille du menu (`components/admin/notifications/`, `lib/admin/notifications.ts`) — fil calculé depuis `soumissions` (fonction `admin_soumissions`), `ad_leads` et `ebay_orders.first_seen_at` ; « vu » par admin dans `admin_notification_state` ; retraits par admin dans `admin_notification_dismissed` et `admin_notification_state.cleared_at` (« Tout effacer ») ; le provider lit toutes les 30 s (même onglet caché), lance la synchro eBay de fond chaque minute et déclenche son (`sons.ts`, Web Audio : cha-ching = vente eBay) + fenêtre en bas à droite (`NotificationsToasts`), un seul onglet sonnant grâce à `localStorage.tl_notif_alerte`
- Périodes et pages partagées : `lib/admin/periodes.ts` + `components/admin/PeriodeSelect.tsx` (paramètre `periode`), `lib/admin/pagination.ts` + `components/admin/Pagination.tsx`. La clé `annee` = **année fiscale de l'entreprise, du 1er avril au 31 mars** (libellé « Année fiscale », comparée à l'an dernier à pareille date)
- Accueil → Chiffres : périodes d'« Aujourd'hui » à « Tout » ; sous les tuiles, graphique simple « Revenus journaliers » (calcul pur `lib/admin/revenus.ts`, dessin `components/admin/ebay/EbaySalesChart.tsx` comme la page Ventes eBay), caché quand la période tient en un jour. Mêmes règles que la tuile Ventes (lot compté à sa date d'achat) : la somme des jours égale la tuile. L'utilisateur veut ce graphique simple : pas de chandelles, de tableau ni de comparaison (retirés le 2026-10-29)
- Pas de bouton « Écrire » sur les soumissions : on répond depuis le webmail Hostinger. « Ouvrir dans Hostinger » passe par `/api/admin/soumissions/[id]/courriel/hostinger`, qui redirige vers `https://mail.hostinger.com/0/mailboxes/{dossier}/{uid}` (repli : boîte de réception, `WEBMAIL_URL`)
- « Voir le courriel » (onglet Soumissions) : Mail API de Hostinger (`lib/hostinger/mail.ts`, routes `/api/admin/soumissions/[id]/courriel` et `.../pieces/[pieceId]`), clé `HOSTINGER_MAIL_API_TOKEN` côté serveur seulement (hPanel → Courriels → Agentic mail → API access ; Hostinger n'offre pas de clé en lecture seule : accès complet à info@, jamais sur Vercel ni dans GitHub). Le formulaire ajoute l'en-tête `X-Technolot-Soumission: <id>` au courriel (`lib/hostinger/config.ts`) ; les anciennes demandes se retrouvent par date + courriel du client.
- Destruction des données (`/admin/destruction-donnees`, groupe eBay du menu) : certificat remis au client (`components/admin/destruction/`, `lib/admin/destruction.ts`, actions `lib/admin/destruction-actions.ts`), dessiné dans le navigateur par html-to-image (photo PNG 300 ppp ; le PDF Lettre contient cette image). Registre `certificats_destruction`, enregistré à chaque téléchargement : numéro TL-AAAA-NNNN attribué par la base (défaut `prochain_numero_certificat()`, compteur par année `certificats_destruction_compteurs`, jamais réutilisé, non modifiable dans le formulaire) ; `company_id` → fiche client `/admin/crm/[id]` (section « Certificats de destruction », qui reprend aussi les certificats non liés au nom identique). Le champ « Nom de la compagnie » propose les compagnies du CRM (clients convertis d'abord) et remplit l'adresse (`street_address`). Politiques des deux tables : `(select public.est_admin())`. Texte : « données détruites et certifiées avec KillDisk », jamais de destruction physique. L'export copie l'intérieur d'un `<svg>` sans les styles de classe : poser police et couleur sur le `<svg>` lui-même ou en attributs.
- Auth : mot de passe (nom d'utilisateur « Info ») ou lien magique Supabase ; liste blanche `ADMIN_EMAILS` + table `public.admins` (à garder alignées) ; `middleware.ts` + garde de chaque page/route/action ; reconnexion obligatoire après 24 h ; double authentification (TOTP) à activer à la mise en ligne. En local, impossible de se connecter (boîte info@technolot.ca) — pour vérifier visuellement, bypass temporaire dans middleware + layout marqué `TEMP-DEV-BYPASS`, à retirer avant commit.

## Supabase (projet aznelukkwitvttycwnjb)

- RLS : toutes les tables admin n'acceptent que `(select public.est_admin())` (compte listé dans `public.admins`) → sans session admin, tout est vide (pages locales vides : normal). Schéma `securite` (secret RPC, limites, journal) non exposé à l'API.
- Tables à NE JAMAIS modifier (schéma) : `soumissions`, `lots`, `email_logs`, `sales`. Le CRM peut seulement les lire/lier (`contacts.lot_id → lots.id`).
- Tables CRM modifiables : `companies` (fit_score 1-10, lead_status, next_followup_on, lead_status_changed_at), `contacts` (stage new→…→converted), `outreach_activities`, `email_templates`, `daily_prospect_batches`.
- `soumissions` n'a aucune politique de lecture : l'admin la lit via la fonction `admin_soumissions` (security definer, réservée à `est_admin()`). La suppression passe par `admin_supprimer_soumission` (même contrôle ; supprime aussi le lead de pub `ad_leads` du même envoi ; le lot éventuel reste).
- Migrations DDL via l'outil MCP apply_migration, toujours avec le même fichier dans `supabase/migrations/`.

## Règles CRM

- Envoi email : `lib/crm/email.ts` (Resend, signature Anthony Després, variables {{prenom}} {{nom}} {{compagnie}} {{titre}}, reply-to = admin connecté). Templates en base (`email_templates`), éditables via /admin/crm/modeles.
- Désabonnement (LCAP) : chaque courriel du CRM porte la mention « répondez désabonner » et l'en-tête `List-Unsubscribe` (boîte `CONTACT_EMAIL`). Bouton « Désabonner » sur la fiche contact → `contacts.unsubscribed_at` ; tout envoi (manuel ou `auto-relances`) est refusé vers une adresse désabonnée, même notée sur une autre fiche (`lib/crm/desabonnement.ts`).
- Rappels de suivi : date détectée dans la note (`parse-followup-date.ts`, fuseau America/Toronto) ou délai de statut (intéressé 3 j, contacté 7 j → `FOLLOWUP_DELAY_DAYS`).
- Conversion client : lot `source=manual, status=negotiating, purchase_price=0`, lie `contacts.lot_id`, compagnie → `research_status=converted`.

## Publicités (Meta / Google Ads)

- Tracking public : `lib/tracking/attribution.ts` (UTM, fbclid, gclid, ad_id… en localStorage `tl_attr`, 30 j) + `components/tracking/AdTracker.tsx` → `/api/track` → fonction SQL à secret `suivi_pub_enregistrer` (l'ancien `track_ad_event` ouvert à anon est révoqué à la mise en ligne). Pixels Meta/Google chargés seulement si `NEXT_PUBLIC_*` présents.
- Leads attribués : `/api/soumission` enregistre la demande (`soumission_enregistrer`) et le lead `ad_leads` (`lead_pub_enregistrer`, champ caché `tl_attr` du formulaire).
- Stats des plateformes : `lib/ads/meta.ts`, `google.ts`, `sync.ts` → `ad_metrics_daily` via POST `/api/admin/ads-sync` (admin connecté ou `Bearer CRON_SECRET` + `SUPABASE_SERVICE_ROLE_KEY`).
- Dashboard : `/admin/pubs` et `/admin/pubs/[platform]/[adId]`, agrégations pures dans `lib/ads/queries.ts`. Guide des clés : `docs/PUBLICITES-SETUP.md`.
- Constantes partagées serveur/client : jamais dans un fichier `"use client"` (ex. `lib/ads/platforms.ts`).

## Sécurité

- Dépôt GitHub PUBLIC : rapports, cartes et inventaire des secrets dans `securite/` (ignoré par Git), jamais ailleurs dans le dépôt ; aucun détail exploitable dans les commits.
- Toute page admin commence par `exigerAdminPage`, toute route par `exigerAdminRoute`, toute action `"use server"` par `adminPourAction` (`lib/securite/garde.ts`) ; `node scripts/verif-garde-admin.mjs` doit passer.
- Validation Zod (`lib/securite/schemas.ts`, `lib/admin/schemas.ts`) au début de chaque entrée ; corps JSON via `lireJson` (taille bornée).
- Erreurs via `reponseErreur` (message générique + réf.) : jamais `error.message` ni texte Supabase/Resend renvoyé au client.
- Limites de débit via `limiter` / `limiterSelon` (`lib/securite/limite.ts`) ; événements via `journaliser` (`lib/securite/journal.ts`, jamais de secret ni de mot de passe).
- Écritures publiques seulement par les fonctions SQL à secret (`SECURITE_RPC_SECRET`, `lib/securite/rpc.ts`) : aucune politique `anon` nouvelle.
- Toute nouvelle table : RLS activée + politiques `(select public.est_admin())`.
- Jamais de clé secrète en `NEXT_PUBLIC_` ; tout nouveau nom de variable va dans `.env.example` (sans valeur).
- CSP imposée : `next.config.mjs` (public) et nonce de `middleware.ts` (admin) ; aucun script en ligne sans nonce, aucun `onclick=` en attribut.
- Demander avant d'ajouter un paquet npm (vérifier qu'il existe et est maintenu).

## Conventions

- Toujours répondre à l'utilisateur en français (Québec), même s'il écrit en anglais.

- Thème admin : fond `night-950`, cartes `.glass`, accent vert `#5ECB33` (`.btn-primary`, `.field` dans `app/globals.css`, couleurs dans `tailwind.config.ts`).
- Wording : jamais « paiement avant notre départ » ; dire « paiement rapide et garanti ».
- Git : messages de commit en français.
- Sessions Claude Code dans le nuage (claude.ai/code, branche imposée `claude/...`) : l'utilisateur veut que TOUS les changements aillent sur `dev`. Travailler sur `dev` (`git fetch origin dev && git checkout -B dev origin/dev`) et pousser sur `dev`, pas sur la branche `claude/...`. Vercel déploie une prévisualisation de `dev` automatiquement.
- Workflow multi-ordi : on travaille TOUJOURS sur la branche `dev` (en début de session : `git fetch origin && git checkout dev && git pull`). Commit + push sur `dev` librement après chaque modif terminée (sert à synchroniser les ordinateurs, ne déploie rien). Ne JAMAIS pousser sur `main` sauf si l'utilisateur dit « mets en ligne » : alors `git checkout main && git pull && git merge --ff-only dev && git push origin main`, puis revenir sur `dev`.
- Déploiement : Hostinger depuis GitHub. `.env.production` n'est PAS versionné (ignoré depuis `ba4aeb6`) : l'hébergeur doit fournir toutes les variables, y compris `NEXT_PUBLIC_SUPABASE_URL` et `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (intégrées au build) et `RESEND_API_KEY`. Preview Vercel de `dev` (techno-lot-dev.vercel.app) : variables dans Vercel → Environment Variables, environnement Preview ; sans les deux clés Supabase, le middleware plante sur /admin (500 MIDDLEWARE_INVOCATION_FAILED). `/api/track` n'enregistre rien en local ni sur les Preview (`VERCEL_ENV=preview`).
