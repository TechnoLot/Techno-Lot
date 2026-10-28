# Suivi des publicités (Meta + Google Ads)

Les statistiques sont synchronisées dans Supabase (`ad_metrics_daily`) par `POST /api/admin/ads-sync`. Toutes les variables vont dans les variables d'environnement du serveur (Hostinger) et dans `.env.local` pour tester, jamais dans `.env.production`.

## Meta (Facebook + Instagram)

1. **Jeton** : Business Manager, Paramètres de l'entreprise, Utilisateurs, **Utilisateurs système**. Crée un utilisateur système (rôle Admin), assigne-lui le compte publicitaire (accès complet ou lecture), puis **Générer un jeton** avec la permission `ads_read` (jeton sans expiration). Copie-le dans `META_ACCESS_TOKEN`.
2. **ID du compte pub** : Gestionnaire de publicités, menu de compte en haut à gauche (ou Paramètres du compte publicitaire). Le numéro, avec ou sans `act_`, va dans `META_AD_ACCOUNT_ID`.
3. **Pixel** : Gestionnaire d'événements, Connecter des sources de données, Web, Meta Pixel. Copie l'ID du Pixel dans `NEXT_PUBLIC_META_PIXEL_ID`.
4. **Paramètres d'URL des pubs** (champ « Paramètres d'URL » de chaque annonce, sans « ? » au début : Meta l'ajoute) :

```
utm_source=facebook&utm_medium=paid&utm_campaign={{campaign.name}}&utm_content={{ad.name}}&campaign_id={{campaign.id}}&adset_id={{adset.id}}&ad_id={{ad.id}}&placement={{placement}}
```

Tant que `META_ACCESS_TOKEN` et `META_AD_ACCOUNT_ID` manquent, `/admin/pubs` affiche l'encadré « Connecter Meta Ads » avec ces étapes (il indique seulement si chaque variable est présente, jamais sa valeur). Les leads venus du site s'affichent quand même.

## Google Ads

1. **Developer token** : dans le compte **gestionnaire** (MCC), Outils, Centre API. Copie le jeton dans `GOOGLE_ADS_DEVELOPER_TOKEN` (le niveau « test » ne lit que les comptes de test : demande l'accès de base).
2. **Client OAuth** : console Google Cloud, active l'API Google Ads, puis Identifiants, Créer un ID client OAuth (application Web, URI de redirection `https://developers.google.com/oauthplayground`). Note `GOOGLE_ADS_CLIENT_ID` et `GOOGLE_ADS_CLIENT_SECRET`.
3. **Refresh token** : ouvre l'[OAuth Playground](https://developers.google.com/oauthplayground), roue dentée, coche « Use your own OAuth credentials » et entre ton client ID / secret. À l'étape 1, saisis le scope `https://www.googleapis.com/auth/adwords`, autorise avec le compte qui a accès à Google Ads, puis « Exchange authorization code for tokens ». Copie le **Refresh token** dans `GOOGLE_ADS_REFRESH_TOKEN`.
4. **Customer ID** : numéro à 10 chiffres en haut à droite de Google Ads, sans les tirets, dans `GOOGLE_ADS_CUSTOMER_ID`. Si tu passes par un compte gestionnaire, mets son ID dans `GOOGLE_ADS_LOGIN_CUSTOMER_ID`.
5. **Suivi** : active le **suivi automatique** (gclid) dans les paramètres du compte. Ajoute ce modèle de suivi au niveau du compte ou de la campagne :

```
{lpurl}?utm_source=google&utm_medium=cpc&utm_campaign={campaignid}&campaign_id={campaignid}&adset_id={adgroupid}&ad_id={creative}
```

Pour la balise de conversion, renseigne `NEXT_PUBLIC_GOOGLE_ADS_ID` (AW-XXXXXXXXX) et `NEXT_PUBLIC_GOOGLE_ADS_LEAD_LABEL`.

## Synchronisation

- Manuelle : `POST /api/admin/ads-sync` en étant connecté comme admin (corps optionnel `{"days": 30}`).
- `GET /api/admin/ads-sync` : indique quelles plateformes sont configurées.
- **Cron Hostinger** (une fois par jour, p. ex. 6 h) : définis `CRON_SECRET` et `SUPABASE_SERVICE_ROLE_KEY` côté serveur, puis :

```
curl -s -X POST https://technolot.ca/api/admin/ads-sync -H "Authorization: Bearer VOTRE_CRON_SECRET" -H "Content-Type: application/json" -d '{"days":7}'
```

Réponse : `{"results":[{"platform":"meta","ok":true,"rows":123,"message":"..."}]}`. Chaque exécution est journalisée dans `ad_sync_runs`.

## Tableau de bord `/admin/pubs`

- Meta par défaut (filtre Google / Toutes gardé), période 7, 30, 90 jours ou personnalisée.
- 5 chiffres : Dépensé, Leads (formulaires envoyés), Coût par lead, Clients acquis, Profit des clients.
- **Client acquis** : un lot `purchased` ou `sold` (pas `negotiating` ni `cancelled`) au même courriel ou téléphone (10 derniers chiffres) que le lead, daté du lead ou d'après (`purchased_at`, tolérance de 2 jours). Chaque lot n'est compté qu'une fois, pour le premier lead de la période qui y correspond. **Profit** : prix de vente − prix d'achat des lots vendus.
- **Verdict** de chaque pub (`lib/ads/verdict.ts`, seuils dans `VERDICT_RULES`) : avec CPL_moy = dépenses ÷ leads de la période, la première règle qui s'applique gagne :
  1. Rentable : clients ≥ 1 et profit ≥ dépenses ;
  2. Prometteuse : leads ≥ 2 et coût par lead ≤ 0,75 × CPL_moy ;
  3. À couper : (0 lead et dépenses ≥ max(50 $, 2 × CPL_moy)) ou (coût par lead ≥ 2 × CPL_moy et 0 client) ;
  4. Trop tôt : dépenses < 25 $ et 0 lead ;
  5. À surveiller : le reste.
- Vérification des cas limites : `node lib/ads/verdict.check.mjs` (Node ≥ 23.6).

## SEO et mesure

- **Variables** (côté serveur Hostinger, et `.env.local` pour tester ; jamais dans `.env.production`, qui est versionné) :
  - `NEXT_PUBLIC_GSC_VERIFICATION` : code de la balise de vérification Google Search Console (méthode « Balise HTML », valeur de `content` seulement). La balise est gérée par les métadonnées SEO du site, pas par le suivi pub.
  - `NEXT_PUBLIC_GA4_ID` : ID de mesure GA4 (`G-XXXXXXXXXX`). Désactivé tant qu'il est absent. S'il est présent, GA4 est configuré par le même gtag que Google Ads (`components/tracking/AdPixels.tsx`, chargement différé) et reçoit `generate_lead` à chaque soumission réussie. Les variables `NEXT_PUBLIC_*` sont intégrées au build : rebâtir après les avoir ajoutées.
- **Ce que le site enregistre déjà, sans GA4** :
  - Visite (`ad_sessions`) : `platform = organic` si le référent est un moteur de recherche, `referrer` = nom d'hôte seulement (ex. `www.google.com`), `landing_path` = page d'arrivée sans paramètres. Fixés à la première visite (30 jours), remplacés seulement par une nouvelle visite avec paramètres pub (UTM, gclid, fbclid).
  - Clics sur les appels à l'action (`ad_events`, type `cta_click`) : liens vers `/soumission` ou `/en/soumission`, `tel:` et `mailto:`. Seul le chemin de la page du clic est stocké (pas le type de lien).
  - Soumission (`ad_leads`) : `platform`, `landing_path`, UTM ; le référent se retrouve par `ad_leads.session_id → ad_sessions.referrer`.
- **Loi 25 (Québec)** : avant d'activer GA4 ou les pixels Meta / Google Ads, vérifier quel consentement est exigé pour ces témoins et traceurs tiers (et mettre à jour la politique de confidentialité). Le site n'affiche actuellement aucune bannière de consentement.
