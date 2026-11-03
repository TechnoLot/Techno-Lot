# Relier le calendrier des ramassages à Google Agenda

Page : `/admin/ramassages` (menu « Ramassages »). L'agenda Google « Ramassages
Techno Lot » est la seule source de vérité : le tableau de bord le lit à chaque
affichage et y écrit directement (création, déplacement, suppression). Une
modification faite dans Google Agenda se voit donc au prochain affichage, ou en
revenant sur l'onglet. Rien n'est copié dans Supabase.

Une simple « clé API » Google ne suffit pas : elle ne donne accès qu'aux données
publiques et ne permet pas d'écrire dans un agenda privé. Le site utilise un
**compte de service** (un « robot » Google avec sa propre adresse courriel), à
qui on partage ce seul agenda.

## 1. Google Cloud (projet « Techno Lot Dashboard »)

1. **API et services → Bibliothèque → Google Calendar API → Activer.**
2. **IAM et administration → Comptes de service → Créer un compte de service** :
   un compte dédié à l'agenda (pas celui de Google Ads), **sans aucun rôle** dans
   le projet.
3. Sur ce compte : **Clés → Ajouter une clé → Créer une clé → JSON**. Le fichier
   téléchargé est un secret : ne jamais l'envoyer par courriel ni le coller dans
   une conversation. Le contenu (brut sur une ligne, ou encodé en base64) va dans
   `GOOGLE_CALENDAR_SERVICE_ACCOUNT_JSON`, puis le fichier est supprimé.

## 2. Google Agenda (compte Google qui possède l'agenda)

1. **Autres agendas → + → Créer un agenda** : « Ramassages Techno Lot », fuseau
   America/Toronto.
2. **Paramètres de l'agenda → Partager avec des personnes ou des groupes
   spécifiques** : ajouter l'adresse du compte de service, droit **« Apporter des
   modifications (voir les événements privés comme disponible/occupé) »** (le plus
   petit droit qui permet d'écrire).
3. **Intégrer l'agenda → ID de l'agenda** (`…@group.calendar.google.com`) →
   `GOOGLE_CALENDAR_ID` (pas un secret).
4. Facultatif : **Notifications par défaut** de cet agenda (ex. 1 h avant) pour
   un rappel sur le téléphone ; partage avec l'équipe au besoin.

## 3. Variables

- Local : `.env.local` (jamais dans Git).
- Production : Hostinger → **Settings and redeploy** → Environment Variables,
  puis le bouton du bas (enregistrer seul ne redéploie pas).

Sans ces deux variables, la page affiche « Google Agenda n'est pas encore relié »
et l'accueil n'affiche aucun ramassage.

## Ce que contient chaque événement

- Titre : « Ramassage · Nom du client » ; lieu : l'adresse ; description : les
  notes, puis « Fiche Techno Lot : <lien> » vers la fiche liée.
- Lien vers la compagnie du CRM ou le lot dans `extendedProperties.private`
  (`companyId`, `lotId`), invisible dans Google Agenda.
- Loi 25 : le minimum (nom de l'entreprise, adresse, notes) ; pas de téléphone
  ni de courriel du contact. Google est nommé dans la politique de
  confidentialité.

## Changer de clé

Créer une nouvelle clé sur le même compte de service, remplacer la variable
(local et Hostinger, avec redéploiement), vérifier la page, puis supprimer
l'ancienne clé dans Google Cloud.
