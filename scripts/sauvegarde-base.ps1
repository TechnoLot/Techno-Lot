<#
.SYNOPSIS
  Copie manuelle de la base Supabase de Techno Lot (schéma + données), rangée HORS du dépôt.

.DESCRIPTION
  Le forfait gratuit de Supabase ne fait aucune sauvegarde automatique : ce script est la
  copie hebdomadaire. Il produit, dans <Destination>\AAAA-MM-JJ_HHmm\ :
    - schema.sql    : structure seule (--schema-only) des schémas public, auth, storage, cron
                      et vault. Aucune donnée, donc aucune valeur du Vault ni ligne de cron.job
                      (dont la commande contient un secret).
    - donnees.dump  : données (format custom -Fc) de toutes les tables du schéma public,
                      de auth.users et auth.identities (pour rétablir les comptes) et de
                      supabase_migrations.schema_migrations (historique des migrations).
    - LISEZMOI.txt  : date, versions, empreintes SHA-256 et marche à suivre pour restaurer.

  La copie contient des données personnelles (prospects, clients, soumissions) : la garder
  chiffrée, hors de Supabase et, si possible, hors de cet ordinateur. Jamais dans le dépôt.

  URL de connexion : variable d'environnement SUPABASE_DB_URL (jamais dans un fichier).
  Où la prendre : tableau de bord Supabase → projet TechnoLot → bouton « Connect » (en haut)
  → onglet « Session pooler » → copier l'URI, puis remplacer [YOUR-PASSWORD] par le mot de
  passe de la base (Project Settings → Database ; « Reset database password » si perdu, à
  noter dans le gestionnaire de mots de passe). Pour la saisir sans qu'elle s'affiche :
      $s = Read-Host 'URI Session pooler' -AsSecureString
      $env:SUPABASE_DB_URL = [System.Net.NetworkCredential]::new('', $s).Password
  Si le mot de passe contient @ : / ? # ou %, l'encoder dans l'URI (ex. @ → %40).

  Le mot de passe n'est jamais écrit dans un fichier ni dans la console : le script le retire
  de l'URI et le passe à pg_dump par la variable PGPASSWORD, effacée à la fin.

  Codes de sortie : 0 = copie complète et vérifiée ; 1 = échec (rien de fiable à garder).

.PARAMETER Destination
  Dossier racine des copies (défaut : $HOME\Sauvegardes-TechnoLot). Refusé s'il est dans le dépôt.

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File scripts\sauvegarde-base.ps1
.EXAMPLE
  powershell -ExecutionPolicy Bypass -File scripts\sauvegarde-base.ps1 -Destination 'E:\Sauvegardes-TechnoLot'
#>
[CmdletBinding()]
param(
  [string]$Destination = (Join-Path $HOME 'Sauvegardes-TechnoLot')
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

# Version majeure du serveur Supabase (Postgres 17) : pg_dump doit être de la même version ou plus récent.
$VersionMinimale = 17

function Write-Etape([string]$Texte) { Write-Host "==> $Texte" -ForegroundColor Cyan }
function Stop-Echec([string]$Texte) {
  Write-Host "ÉCHEC : $Texte" -ForegroundColor Red
  exit 1
}

# --- 1. pg_dump / pg_restore installés ? --------------------------------------------------------
function Find-OutilPostgres([string]$Nom) {
  $cmd = Get-Command $Nom -ErrorAction SilentlyContinue
  if ($cmd) { return $cmd.Source }
  # Installation EDB / winget par défaut, même si le dossier bin n'est pas dans le PATH.
  $candidats = @(Get-ChildItem -Path "$env:ProgramFiles\PostgreSQL\*\bin\$Nom.exe" -ErrorAction SilentlyContinue |
    Sort-Object { [int]($_.Directory.Parent.Name -replace '[^0-9].*$', '0') } -Descending)
  if ($candidats.Count -gt 0) { return $candidats[0].FullName }
  return $null
}

$pgDump = Find-OutilPostgres 'pg_dump'
$pgRestore = Find-OutilPostgres 'pg_restore'
if (-not $pgDump -or -not $pgRestore) {
  Write-Host @"
pg_dump / pg_restore introuvables. Installer les outils PostgreSQL $VersionMinimale (une seule fois) :
  winget install PostgreSQL.PostgreSQL.17
  (ou l'installateur EDB https://www.postgresql.org/download/windows/ en ne cochant que
   « Command Line Tools »), puis ajouter C:\Program Files\PostgreSQL\17\bin au PATH
   et rouvrir PowerShell.
"@ -ForegroundColor Yellow
  Stop-Echec 'outils PostgreSQL absents.'
}

$versionTexte = (& $pgDump --version) | Select-Object -First 1
if ($LASTEXITCODE -ne 0 -or $versionTexte -notmatch '(\d+)(\.\d+)?') { Stop-Echec "impossible de lire la version de pg_dump ($pgDump)." }
$versionMajeure = [int]$Matches[1]
if ($versionMajeure -lt $VersionMinimale) {
  Stop-Echec "pg_dump $versionMajeure trouvé ($pgDump) ; il faut la version $VersionMinimale ou plus (serveur Supabase en Postgres $VersionMinimale). winget install PostgreSQL.PostgreSQL.17"
}
Write-Etape "Outils : $versionTexte"

# --- 2. URL de connexion (jamais affichée) -----------------------------------------------------
if ([string]::IsNullOrWhiteSpace($env:SUPABASE_DB_URL)) {
  Write-Host @"
Variable SUPABASE_DB_URL absente. Dans cette fenêtre PowerShell :
  `$s = Read-Host 'URI Session pooler' -AsSecureString
  `$env:SUPABASE_DB_URL = [System.Net.NetworkCredential]::new('', `$s).Password
URI : tableau de bord Supabase → Connect → Session pooler (mot de passe de la base à la place de [YOUR-PASSWORD]).
"@ -ForegroundColor Yellow
  Stop-Echec 'SUPABASE_DB_URL non définie.'
}

try {
  $uri = [System.Uri]$env:SUPABASE_DB_URL.Trim()
} catch {
  Stop-Echec "SUPABASE_DB_URL n'est pas une URI valide (postgresql://utilisateur:motdepasse@hote:5432/postgres). Caractères spéciaux du mot de passe à encoder (@ → %40)."
}
if ($uri.Scheme -notin @('postgresql', 'postgres')) { Stop-Echec "SUPABASE_DB_URL doit commencer par postgresql://" }
$sep = $uri.UserInfo.IndexOf(':')
if ($sep -lt 1) { Stop-Echec "SUPABASE_DB_URL ne contient pas de mot de passe (remplacer [YOUR-PASSWORD])." }
$utilisateur = [System.Uri]::UnescapeDataString($uri.UserInfo.Substring(0, $sep))
$motDePasse = [System.Uri]::UnescapeDataString($uri.UserInfo.Substring($sep + 1))
if ([string]::IsNullOrEmpty($motDePasse) -or $motDePasse -eq '[YOUR-PASSWORD]') { Stop-Echec "mot de passe absent de SUPABASE_DB_URL (remplacer [YOUR-PASSWORD])." }
$port = $uri.Port
if ($port -le 0) { $port = 5432 }
if ($port -eq 6543) { Stop-Echec "port 6543 = Transaction pooler, incompatible avec pg_dump. Prendre l'onglet « Session pooler » (port 5432)." }
$base = $uri.AbsolutePath.TrimStart('/')
if ([string]::IsNullOrEmpty($base)) { $base = 'postgres' }
$hote = $uri.Host

# URI SANS mot de passe : le mot de passe passe par PGPASSWORD (variable du processus seulement).
$uriSansSecret = 'postgresql://{0}@{1}:{2}/{3}?sslmode=require' -f [System.Uri]::EscapeDataString($utilisateur), $hote, $port, $base

# --- 3. Dossier de destination, hors du dépôt --------------------------------------------------
$racineDepot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path.TrimEnd('\')
$destinationComplete = [System.IO.Path]::GetFullPath($Destination).TrimEnd('\')
if ($destinationComplete -eq $racineDepot -or $destinationComplete.StartsWith($racineDepot + '\', [System.StringComparison]::OrdinalIgnoreCase)) {
  Stop-Echec "la destination ($destinationComplete) est dans le dépôt. Les copies contiennent des données personnelles : choisir un dossier hors du projet."
}
$horodatage = Get-Date -Format 'yyyy-MM-dd_HHmm'
$dossier = Join-Path $destinationComplete $horodatage
if (Test-Path -LiteralPath $dossier) { Stop-Echec "le dossier $dossier existe déjà (relancer dans une minute)." }
New-Item -ItemType Directory -Path $dossier -Force | Out-Null
Write-Etape "Destination : $dossier"
Write-Etape "Serveur : $hote (port $port, base $base, utilisateur $utilisateur)"

$fichierSchema = Join-Path $dossier 'schema.sql'
$fichierDonnees = Join-Path $dossier 'donnees.dump'
$fichierLisezmoi = Join-Path $dossier 'LISEZMOI.txt'

$ancienPgPassword = $env:PGPASSWORD
$ancienPgSslMode = $env:PGSSLMODE
$codeSortie = 1
try {
  $env:PGPASSWORD = $motDePasse
  $env:PGSSLMODE = 'require'

  # --- 4. Structure (aucune donnée) --------------------------------------------------------------
  Write-Etape 'schema.sql : structure des schémas public, auth, storage, cron, vault (sans données)'
  # Arguments passés un par un (tableau) : aucun souci d'espaces ni de guillemets dans les chemins.
  $argsStructure = @(
    '--dbname', $uriSansSecret, '--no-password', '--schema-only',
    '--schema', 'public', '--schema', 'auth', '--schema', 'storage', '--schema', 'cron', '--schema', 'vault',
    '--file', $fichierSchema
  )
  & $pgDump @argsStructure
  if ($LASTEXITCODE -ne 0) { throw "pg_dump (structure) a échoué (code $LASTEXITCODE)." }

  # --- 5. Données ---------------------------------------------------------------------------------
  Write-Etape 'donnees.dump : données de public.*, auth.users, auth.identities, historique des migrations'
  # Le rôle postgres de Supabase contourne la RLS (rolbypassrls) : toutes les lignes sont copiées.
  $argsDonnees = @(
    '--dbname', $uriSansSecret, '--no-password', '--data-only', '--format', 'custom',
    '--table', 'public.*', '--table', 'auth.users', '--table', 'auth.identities',
    '--table', 'supabase_migrations.schema_migrations',
    '--file', $fichierDonnees
  )
  & $pgDump @argsDonnees
  if ($LASTEXITCODE -ne 0) { throw "pg_dump (données) a échoué (code $LASTEXITCODE)." }

  # --- 6. Vérification : la copie se relit et contient les tables essentielles --------------------
  Write-Etape 'Vérification de la copie'
  if ((Get-Item -LiteralPath $fichierSchema).Length -lt 1000) { throw 'schema.sql est presque vide.' }
  $sommaire = & $pgRestore --list $fichierDonnees
  if ($LASTEXITCODE -ne 0) { throw "pg_restore --list ne relit pas donnees.dump (code $LASTEXITCODE)." }
  $attendues = @('public lots', 'public sales', 'public companies', 'public contacts', 'public certificats_destruction',
                 'public certificats_destruction_compteurs', 'auth users', 'auth identities')
  $manquantes = @($attendues | Where-Object { -not ($sommaire -match ("TABLE DATA " + [regex]::Escape($_) + " ")) })
  if ($manquantes.Count -gt 0) { throw ("tables absentes de donnees.dump : " + ($manquantes -join ', ')) }
  $nbTables = @($sommaire | Where-Object { $_ -match ' TABLE DATA ' }).Count

  # --- 7. LISEZMOI.txt -----------------------------------------------------------------------------
  $empreintes = foreach ($f in @($fichierSchema, $fichierDonnees)) {
    $h = Get-FileHash -LiteralPath $f -Algorithm SHA256
    '  {0}  {1}  ({2:N0} octets)' -f $h.Hash, (Split-Path $f -Leaf), (Get-Item -LiteralPath $f).Length
  }
  $lisezmoi = @"
Copie de la base Supabase de Techno Lot
=======================================
Date            : $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss zzz')
Serveur         : $hote (port $port, base $base)
pg_dump         : $versionTexte
Tables copiées  : $nbTables (données)

Contenu
  schema.sql    structure seule : public, auth, storage, cron, vault (aucune valeur du Vault,
                aucune ligne de cron.job)
  donnees.dump  données, format custom (pg_restore) : public.*, auth.users, auth.identities,
                supabase_migrations.schema_migrations

Empreintes SHA-256 (vérifier avant une restauration : Get-FileHash <fichier> -Algorithm SHA256)
$($empreintes -join "`r`n")

CONFIDENTIEL : données personnelles (prospects, clients, soumissions, comptes). Garder chiffré,
hors de Supabase, hors du dépôt Git, idéalement hors de cet ordinateur.

Ce qui n'est PAS dans cette copie (à garder à part, voir securite\RESTORE.md) :
  code et secrets des fonctions Edge, tâches pg_cron (commande avec secret), réglages Auth,
  valeurs du Vault, clés API.

Restaurer (TOUJOURS dans un NOUVEAU projet Supabase, jamais dans la production)
  Procédure complète : securite\RESTORE.md (dossier du projet, hors Git). En bref :
  1. Nouveau projet ; vérifier que son URI ne contient PAS le ref de la production.
  2. Rejouer les migrations du dépôt (supabase\migrations, ordre des noms) jusqu'à
     20261029190000 inclus, en renommant soumissions.created_at en "DATE" juste avant
     20261028200000 (changement fait hors migration en production).
  3. Comptes : pg_restore --data-only --no-owner --schema=auth --table=users --table=identities -f comptes.sql donnees.dump
     puis psql -v ON_ERROR_STOP=1 --single-transaction -f comptes.sql
  4. Rejouer les migrations 20261030* (elles exigent le compte info@technolot.ca).
  5. Données : pg_restore --data-only --no-owner --schema=public -f public.sql donnees.dump
     puis psql -v ON_ERROR_STOP=1 --single-transaction
       -c "SET session_replication_role = replica"
       -c "truncate public.admins, public.email_templates, public.certificats_destruction_compteurs cascade"
       -f public.sql
  6. Fonctions Edge, secrets Edge, tâches pg_cron, réglages Auth : voir RESTORE.md.
"@
  Set-Content -LiteralPath $fichierLisezmoi -Value $lisezmoi -Encoding UTF8

  Write-Host ''
  Write-Host "Copie terminée : $dossier" -ForegroundColor Green
  Write-Host "  $nbTables tables de données ; empreintes dans LISEZMOI.txt." -ForegroundColor Green
  Write-Host '  Étape suivante : chiffrer ce dossier (7-Zip AES-256 ou clé USB BitLocker) et le copier hors de cet ordinateur.' -ForegroundColor Green
  $codeSortie = 0
}
catch {
  Write-Host "ÉCHEC : $($_.Exception.Message)" -ForegroundColor Red
  Write-Host "Copie incomplète laissée dans $dossier : ne pas la conserver comme sauvegarde." -ForegroundColor Red
  $codeSortie = 1
}
finally {
  # Effacer le mot de passe de l'environnement du processus et de la mémoire du script.
  $env:PGPASSWORD = $ancienPgPassword
  $env:PGSSLMODE = $ancienPgSslMode
  $motDePasse = $null
}
exit $codeSortie
