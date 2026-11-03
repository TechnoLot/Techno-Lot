# Agent Acheteurs : Claude cherche depuis votre ordinateur

Sur une soumission, « Trouver des acheteurs », puis « Lancer la recherche ».
La recherche se met en file sur le site. Votre ordinateur la prend dans les
5 minutes et fait chercher Claude sur le Web avec **votre forfait Claude**,
sans frais de plus. Quand Claude a fini, les acheteurs et les prix
apparaissent sur la soumission, en 5 à 15 minutes environ. Vous pouvez fermer
le panneau entre-temps.

## Coût : aucun

L'agent passe par la connexion claude.ai de votre abonnement Claude Max, que
vous payez déjà. Il n'utilise aucune clé d'API et n'a ni carte ni facture.

Les recherches comptent seulement dans les limites d'utilisation de votre
abonnement, comme si vous travailliez dans l'app Claude. Si la limite est
atteinte, la recherche s'arrête et affiche « Limite de votre forfait Claude
atteinte » : rien n'est acheté.

Seule exception : une option d'utilisation supplémentaire payante activée
dans votre compte Claude. Laissez-la désactivée.

## Comment ça marche

1. L'admin met la recherche en file (table `recherches_acheteurs`, statut
   `en_attente`).
2. La tâche planifiée Windows « Techno Lot - Agent Acheteurs » lance
   `agent.ps1` toutes les 5 minutes, sans ouvrir de fenêtre.
   - Il demande au site s'il y a une recherche (`POST /api/cron/acheteurs/prendre`).
   - S'il n'y en a pas, il s'arrête là. Claude n'est pas appelé et aucun
     jeton n'est utilisé.
3. S'il y en a une, Claude Code cherche en mode « sans interface ».
   - Modèle : Sonnet, effort moyen.
   - Outils : recherche Web et lecture de pages seulement. Rien sur l'ordinateur.
   - Aucune extension ni aucun réglage de l'app Claude : il utilise un
     dossier de connexion à part.
   - Durée : 15 minutes au plus.
   - Plafond : 15 recherches par 24 h. Ce plafond protège votre forfait.
4. L'agent renvoie la réponse de Claude (`POST /api/cron/acheteurs/reponse`).
   - Le site la vérifie (`lib/acheteurs/reponse.ts`) et range les compagnies
     dans le carnet (CRM → Acheteurs).
   - Une réponse qui n'a pas pu partir (Internet coupé) est gardée et
     renvoyée au passage suivant.

Seules les lignes d'articles, masquées (cartes, NAS), partent vers Claude :
jamais le nom, les coordonnées ni l'entreprise du client (Loi 25).

## Installer (une fois, sur l'ordinateur qui reste allumé)

Dans PowerShell, depuis le dossier du site :

```powershell
powershell -ExecutionPolicy Bypass -File scripts/agent-acheteurs/installer.ps1
```

Le programme d'installation fait trois choses :

1. Il copie l'agent dans `%USERPROFILE%\.technolot\agent-acheteurs`. Ce n'est pas
   dans AppData : l'app Claude range ailleurs ce qu'on y écrit depuis ses
   fenêtres, et la tâche planifiée ne le verrait pas.
2. Il crée la clé de l'agent, chiffrée pour votre compte Windows. Elle n'est
   jamais affichée.
3. Il crée la tâche planifiée.

Il faut ensuite **connecter Claude, une seule fois** :

```powershell
powershell -ExecutionPolicy Bypass -File scripts/agent-acheteurs/connecter-claude.ps1
```

1. Une fenêtre s'ouvre, puis le navigateur.
2. Connectez-vous avec votre compte Claude (forfait Max) et acceptez.
3. Si la fenêtre demande un code, collez celui que le navigateur affiche.

## Mise en ligne (une fois)

1. Appliquer la migration `supabase/migrations/20261103120000_agent_acheteurs.sql`.
2. Chez Hostinger, ajouter la variable `AGENT_ACHETEURS_SECRET` (voir les
   étapes plus bas).
3. Redéployer. Avant, la recherche reste « en file d'attente », car le site
   refuse l'agent.

Pour ajouter la variable :

1. Lancer `copier-cle.ps1` (même dossier). Il met la clé dans le
   presse-papiers, sans l'afficher. Elle n'est ni gardée dans l'historique de
   Windows (Windows + V) ni envoyée dans le nuage.
2. Chez Hostinger : « Settings and redeploy », puis variable
   `AGENT_ACHETEURS_SECRET`, Ctrl+V, puis le bouton du bas.
3. Lancer `copier-cle.ps1 -Effacer` : il vide le presse-papiers.

La clé reste secrète : jamais dans GitHub (dépôt public), seulement sur cet
ordinateur (chiffrée pour votre compte Windows) et chez Hostinger.

Pas besoin de cette variable en local : `SUPABASE_SERVICE_ROLE_KEY` manque
dans `.env.local`, donc les routes de l'agent ne marchent qu'en ligne.

## Si quelque chose cloche

- **Le journal** : `%USERPROFILE%\.technolot\agent-acheteurs\journal.log`.
  - Il contient une ligne par recherche : sa durée et son nombre de tours.
  - Il ne contient ni la clé ni les articles.
- **« Votre ordinateur n'a pas encore pris la recherche »** : l'ordinateur est
  éteint, en veille, ou la session Windows est fermée. La recherche partira
  toute seule.
- **« Claude n'est pas prêt sur votre ordinateur »** : relancez
  `connecter-claude.ps1`. Claude Code est celui de l'app Claude : si l'app
  a été désinstallée, réinstallez-la.
- **« Limite de votre forfait Claude atteinte »** : attendez que la limite du
  forfait se libère, puis « Relancer la recherche ».
- **Clé refusée (401 au journal)** : la variable `AGENT_ACHETEURS_SECRET`
  chez Hostinger ne correspond pas. Relancez `copier-cle.ps1`, recollez la
  clé chez Hostinger, puis redéployez.
- **Changer la clé** :
  1. Lancez `installer.ps1 -NouvelleCle`, puis `copier-cle.ps1`.
  2. Collez la clé chez Hostinger, puis redéployez.
- **Essai sans le site** :

  ```powershell
  powershell -ExecutionPolicy Bypass -File "$env:USERPROFILE\.technolot\agent-acheteurs\agent.ps1" -Essai -Demande demande.txt -Resultat resultat.json
  ```

- **Retirer l'agent** : `desinstaller.ps1`. Il retire la tâche et le dossier.
  Avec `-GarderDossier`, il retire seulement la tâche.
