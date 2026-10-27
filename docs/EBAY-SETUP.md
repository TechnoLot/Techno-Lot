# Connecter eBay

Les ventes eBay sont enregistrées dans la table `ebay_orders` puis ajoutées aux
« Ventes » et au « Profit » du tableau de bord. Page : `/admin/ventes-ebay`.

## 1. Clés de l'application (portail développeur eBay)

1. Ouvrir <https://developer.ebay.com/my/keys> (compte développeur Techno Lot).
2. Jeu de clés **Production** :
   - **App ID (Client ID)** → `EBAY_APP_ID`
   - **Cert ID (Client Secret)** → `EBAY_CERT_ID`

## 2. Refresh token du compte vendeur

1. Ouvrir <https://developer.ebay.com/my/auth/?env=production&index=0> (User Tokens).
2. Choisir **OAuth**, se connecter avec le compte vendeur Techno Lot et accepter
   les droits demandés.
3. Copier le **refresh token** (valide 18 mois) → `EBAY_REFRESH_TOKEN`.

Droits (scopes) nécessaires :

| Droit | Utilité |
| --- | --- |
| `sell.fulfillment` (ou `.readonly`) | lire les commandes : **obligatoire** |
| `sell.finances` | lire les frais eBay retirés du profit |
| `sell.inventory.readonly`, `sell.analytics.readonly`, `commerce.identity.readonly` | panneau « Boutique en direct » |

Sans `sell.finances`, les ventes comptent quand même ; les frais ne sont connus
que si eBay les indique dans la commande (`totalMarketplaceFee`).

## 3. Variables d'environnement

Dans `.env.local` (ordinateur) **et** chez l'hébergeur (Hostinger → variables
d'environnement), puis redémarrer le site :

```
EBAY_APP_ID=
EBAY_CERT_ID=
EBAY_REFRESH_TOKEN=
EBAY_MARKETPLACE_ID=EBAY_CA   # facultatif
```

Ne jamais mettre ces valeurs dans `.env.production` (versionné).

## 4. Synchroniser

- Bouton **Synchroniser avec eBay** sur `/admin/ventes-ebay`.
  Premier passage : 365 derniers jours. Ensuite : commandes modifiées depuis la
  dernière synchronisation réussie (48 h de chevauchement, pour capter les
  annulations et remboursements).
- Automatique (cron) :
  `POST /api/admin/ebay-sync` avec l'en-tête `Authorization: Bearer $CRON_SECRET`.
  Exige `CRON_SECRET` et `SUPABASE_SERVICE_ROLE_KEY` côté serveur.

## Règles de calcul

- Une vente compte pour le **total payé par l'acheteur** (articles + livraison + taxes).
- Les commandes **annulées** ou **entièrement remboursées** ne comptent pas
  (un remboursement partiel est retiré du total).
- Les frais eBay sont retirés du profit seulement quand ils sont connus.
- Les jours sont calculés à l'heure de Toronto.
