<#
  Agent Acheteurs de Techno Lot : tâche planifiée Windows, toutes les 5 minutes
  (installée par installer.ps1, guide : docs/AGENT-ACHETEURS.md).

  1. Demande au site la prochaine recherche d'acheteurs (POST
     /api/cron/acheteurs/prendre). Rien à faire : il s'arrête, sans appeler
     Claude (aucun jeton utilisé).
  2. Sinon, lance Claude Code sans interface avec le forfait Claude de
     l'utilisateur : modèle Sonnet, recherche Web et lecture de pages
     seulement, aucun outil de l'ordinateur, aucun réglage ni extension
     (dossier de configuration à part), 15 minutes au plus.
  3. Renvoie sa réponse au site (POST /api/cron/acheteurs/reponse), qui la
     vérifie et range les acheteurs. Une réponse qui n'a pas pu partir est
     gardée et renvoyée au passage suivant (jamais deux recherches pour rien).

  La clé de l'agent (AGENT_ACHETEURS_SECRET) est gardée chiffrée pour ce
  compte Windows (config.xml) ; elle n'est jamais écrite au journal.

  Essai sans le site : agent.ps1 -Essai -Demande demande.txt -Resultat resultat.json
#>
param(
  [switch]$Essai,
  [string]$Demande,
  [string]$Resultat
)

$ErrorActionPreference = "Stop"
$Base = Join-Path $env:USERPROFILE ".technolot\agent-acheteurs"
$Journal = Join-Path $Base "journal.log"
$ARenvoyer = Join-Path $Base "reponses-a-renvoyer"
$Travail = Join-Path $Base "travail"
$ConfigClaude = Join-Path $Base "claude"
$DelaiClaudeSecondes = 15 * 60

# Consigne courte à la place de celle de Claude Code (moins de jetons à chaque tour).
$Consigne = @"
Tu es l'assistant de recherche commerciale de Techno Lot, une entreprise du Québec qui rachète des lots d'équipement informatique et électronique d'entreprises.
Tu n'as que deux outils : la recherche Web et la lecture de pages Web.
Sois efficace : une quarantaine de recherches ou de pages au plus, en tout, pages Contact comprises. Arrête-toi dès que tu as assez de compagnies sérieuses pour chaque famille d'articles.
N'invente jamais une compagnie, une page, un courriel ni un prix.
Réponds exactement dans le format demandé, sans rien ajouter avant ni après.
"@

foreach ($dossier in @($Base, $ARenvoyer, $Travail, $ConfigClaude)) {
  if (-not (Test-Path $dossier)) { New-Item -ItemType Directory -Force $dossier | Out-Null }
}

function Ecrire([string]$message, [switch]$SiNouveau) {
  # -SiNouveau : pas de répétition, toutes les 5 minutes, du même avertissement.
  if ($SiNouveau -and (Test-Path $Journal) -and ((Get-Content $Journal -Tail 1 -Encoding UTF8) -like "*  $message")) { return }
  $ligne = "{0:yyyy-MM-dd HH:mm:ss}  {1}" -f (Get-Date), $message
  Add-Content -Path $Journal -Value $ligne -Encoding UTF8
  if ((Get-Item $Journal).Length -gt 1MB) { Move-Item -Force $Journal "$Journal.1" }
  # Write-Host : à l'écran seulement, jamais dans la valeur rendue par une fonction.
  if ($Essai) { Write-Host $ligne }
}

# Une seule copie à la fois (la tâche planifiée ignore déjà les doublons).
$verrou = New-Object System.Threading.Mutex($false, "Local\TechnoLotAgentAcheteurs")
if (-not $verrou.WaitOne(0)) { exit 0 }

[Net.ServicePointManager]::SecurityProtocol = [Net.ServicePointManager]::SecurityProtocol -bor [Net.SecurityProtocolType]::Tls12
Add-Type -AssemblyName System.Net.Http

function Lire-Config {
  $fichier = Join-Path $Base "config.xml"
  if (-not (Test-Path $fichier)) { throw "Configuration absente : lancez installer.ps1." }
  $config = Import-Clixml $fichier
  $bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($config.Cle)
  try { $cle = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr) }
  finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr) }
  [pscustomobject]@{
    Site   = ([string]$config.Site).TrimEnd("/")
    Cle    = $cle
    Modele = if ($config.Modele) { [string]$config.Modele } else { "sonnet" }
    Effort = if ($config.Effort) { [string]$config.Effort } else { "medium" }
  }
}

function Appeler-Site($config, [string]$chemin, [string]$json) {
  $client = New-Object System.Net.Http.HttpClient
  $client.Timeout = [TimeSpan]::FromSeconds(60)
  try {
    $requete = New-Object System.Net.Http.HttpRequestMessage([System.Net.Http.HttpMethod]::Post, "$($config.Site)$chemin")
    $requete.Headers.Authorization = New-Object System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", $config.Cle)
    $requete.Headers.UserAgent.ParseAdd("TechnoLot-AgentAcheteurs/1.0")
    if ($json) { $requete.Content = New-Object System.Net.Http.StringContent($json, [Text.Encoding]::UTF8, "application/json") }
    $reponse = $client.SendAsync($requete).GetAwaiter().GetResult()
    $octets = $reponse.Content.ReadAsByteArrayAsync().GetAwaiter().GetResult()
    [pscustomobject]@{ Statut = [int]$reponse.StatusCode; Texte = [Text.Encoding]::UTF8.GetString($octets) }
  }
  finally { $client.Dispose() }
}

function Trouver-Claude {
  $installes = @(Get-ChildItem (Join-Path $env:LOCALAPPDATA "Claude-Data\*\claude-code\*\*\claude.exe") -ErrorAction SilentlyContinue)
  if ($installes.Count -gt 0) {
    $version = { try { [version]$_.Directory.Parent.Name } catch { [version]"0.0" } }
    return ($installes | Sort-Object -Property @{ Expression = $version; Descending = $true }, @{ Expression = "LastWriteTime"; Descending = $true } | Select-Object -First 1).FullName
  }
  $commande = Get-Command claude.exe -ErrorAction SilentlyContinue
  if ($commande) { return $commande.Source }
  $local = Join-Path $env:USERPROFILE ".local\bin\claude.exe"
  if (Test-Path $local) { return $local }
  return $null
}

function Lancer-Claude([string]$exe, [string[]]$arguments, [string]$entree, [int]$delaiSecondes) {
  $psi = New-Object System.Diagnostics.ProcessStartInfo
  $psi.FileName = $exe
  $psi.Arguments = ($arguments | ForEach-Object { if ($_ -match '[\s"]') { '"' + ($_ -replace '"', '\"') + '"' } else { $_ } }) -join " "
  $psi.WorkingDirectory = $Travail
  $psi.UseShellExecute = $false
  $psi.CreateNoWindow = $true
  $psi.RedirectStandardInput = $true
  $psi.RedirectStandardOutput = $true
  $psi.RedirectStandardError = $true
  $psi.StandardOutputEncoding = New-Object System.Text.UTF8Encoding($false)
  $psi.StandardErrorEncoding = New-Object System.Text.UTF8Encoding($false)
  # Rien de l'environnement de l'app Claude : seulement le dossier de configuration de l'agent.
  foreach ($nom in @($psi.EnvironmentVariables.Keys)) {
    if ($nom -match '^(CLAUDE|ANTHROPIC|MCP)') { $psi.EnvironmentVariables.Remove($nom) }
  }
  $psi.EnvironmentVariables["CLAUDE_CONFIG_DIR"] = $ConfigClaude
  $psi.EnvironmentVariables["DISABLE_AUTOUPDATER"] = "1"

  $p = [System.Diagnostics.Process]::Start($psi)
  $sortie = $p.StandardOutput.ReadToEndAsync()
  $erreurs = $p.StandardError.ReadToEndAsync()
  if ($entree) {
    $octets = [Text.Encoding]::UTF8.GetBytes($entree)
    $p.StandardInput.BaseStream.Write($octets, 0, $octets.Length)
  }
  $p.StandardInput.Close()
  if (-not $p.WaitForExit($delaiSecondes * 1000)) {
    & taskkill.exe /PID $p.Id /T /F 2>$null | Out-Null
    return [pscustomobject]@{ Fini = $false; Code = $null; Sortie = ""; Erreurs = "" }
  }
  $p.WaitForExit()
  [pscustomobject]@{ Fini = $true; Code = $p.ExitCode; Sortie = $sortie.Result; Erreurs = $erreurs.Result }
}

<#
  Fait chercher Claude. Rend @{ Reponse = texte } ou @{ Echec = raison }
  (delai, tours, connexion, limite, autre : messages dans lib/acheteurs/types.ts).
#>
function Chercher($config, [string]$demande) {
  $exe = Trouver-Claude
  if (-not $exe) {
    Ecrire "Claude Code introuvable sur cet ordinateur."
    return @{ Echec = "connexion" }
  }
  $fichierConsigne = Join-Path $Travail "consigne.txt"
  [IO.File]::WriteAllText($fichierConsigne, $Consigne, (New-Object System.Text.UTF8Encoding($false)))

  $arguments = @(
    "-p", "--output-format", "json",
    "--model", $config.Modele, "--effort", $config.Effort,
    "--tools", "WebSearch,WebFetch", "--allowedTools", "WebSearch,WebFetch",
    "--permission-mode", "dontAsk", "--permission-prompts", "none",
    "--strict-mcp-config", "--safe-mode", "--disable-slash-commands", "--no-session-persistence",
    "--max-turns", "60",
    "--system-prompt-file", $fichierConsigne
  )
  $debut = Get-Date
  $r = Lancer-Claude $exe $arguments $demande $DelaiClaudeSecondes
  $minutes = [math]::Round(((Get-Date) - $debut).TotalMinutes, 1)
  if (-not $r.Fini) {
    Ecrire "Claude n'a pas fini en $($DelaiClaudeSecondes / 60) minutes : arrêté."
    return @{ Echec = "delai" }
  }

  $json = $null
  try { $json = $r.Sortie | ConvertFrom-Json } catch { }
  $texte = if ($json) { [string]$json.result } else { "$($r.Sortie) $($r.Erreurs)" }
  if ($json) {
    Ecrire "Claude a fini en $minutes min : $($json.num_turns) tours, avec votre abonnement Claude (rien de facturé)."
  }

  $erreurClaude = (-not $json) -or $json.is_error
  if ($json -and ($json.subtype -eq "error_max_turns" -or $json.terminal_reason -eq "max_turns")) { return @{ Echec = "tours" } }
  if ($erreurClaude) {
    if ($texte -match 'log ?in|/login|auth|credential|OAuth|401|403') { $raison = "connexion" }
    elseif ($texte -match 'limit|quota|429|overloaded|usage') { $raison = "limite" }
    else { $raison = "autre" }
    $extrait = ($texte -replace '\s+', ' ')
    if ($extrait.Length -gt 160) { $extrait = $extrait.Substring(0, 160) }
    Ecrire "Claude a échoué ($raison) : $extrait"
    return @{ Echec = $raison }
  }
  if (-not $texte.Trim()) { return @{ Echec = "autre" } }
  return @{ Reponse = $texte }
}

<# Envoie une réponse gardée sur le disque ; le fichier part dès que le site l'a reçue (ou refusée pour de bon). #>
function Renvoyer($config, [string]$fichier) {
  $json = [IO.File]::ReadAllText($fichier, [Text.Encoding]::UTF8)
  try { $r = Appeler-Site $config "/api/cron/acheteurs/reponse" $json }
  catch {
    Ecrire "Site injoignable : réponse gardée, nouvel envoi au prochain passage."
    return $false
  }
  switch ($r.Statut) {
    200 { Ecrire "Réponse reçue par le site : $($r.Texte)" }
    409 { Ecrire "Recherche annulée, relancée ou reprise entre-temps : réponse ignorée par le site." }
    400 {
      # Réponse refusée : la recherche passe en échec (sinon elle serait reprise, et Claude relancé, 30 minutes plus tard).
      $envoye = $json | ConvertFrom-Json
      if ($envoye.reponse) {
        Ecrire "Réponse refusée par le site (format) : signalée comme échec."
        $echec = [ordered]@{ id = [string]$envoye.id; jeton = [string]$envoye.jeton; echec = "autre" } | ConvertTo-Json -Compress
        [IO.File]::WriteAllText($fichier, $echec, (New-Object System.Text.UTF8Encoding($false)))
        return (Renvoyer $config $fichier)
      }
      Ecrire "Échec refusé par le site (format)."
    }
    401 { Ecrire "Clé de l'agent refusée par le site : réponse gardée (voir docs/AGENT-ACHETEURS.md)."; return $false }
    default { Ecrire "Le site n'a pas pu recevoir la réponse ($($r.Statut)) : gardée pour le prochain passage."; return $false }
  }
  Remove-Item -Force $fichier
  return $true
}

try {
  if ($Essai) {
    if (-not $Demande -or -not (Test-Path $Demande)) { throw "Essai : -Demande <fichier texte> est requis." }
    $config = [pscustomobject]@{ Modele = "sonnet"; Effort = "medium" }
    try { $lue = Lire-Config; $config.Modele = $lue.Modele; $config.Effort = $lue.Effort } catch { }
    Ecrire "Essai : recherche lancée (sans le site)."
    $resultatEssai = Chercher $config ([IO.File]::ReadAllText($Demande, [Text.Encoding]::UTF8))
    if ($Resultat) {
      [IO.File]::WriteAllText($Resultat, ($resultatEssai | ConvertTo-Json -Depth 4), (New-Object System.Text.UTF8Encoding($false)))
    }
    if ($resultatEssai.Echec) { Ecrire "Essai : échec ($($resultatEssai.Echec))." } else { Ecrire "Essai : réponse reçue ($($resultatEssai.Reponse.Length) caractères)." }
    exit 0
  }

  $config = Lire-Config

  # D'abord les réponses qui n'ont pas pu partir.
  foreach ($f in @(Get-ChildItem $ARenvoyer -Filter "*.json" -ErrorAction SilentlyContinue)) {
    if (-not (Renvoyer $config $f.FullName)) { exit 0 }
  }

  try { $prise = Appeler-Site $config "/api/cron/acheteurs/prendre" $null }
  catch { exit 0 } # site injoignable (Internet coupé, mise en veille) : on réessaiera dans 5 minutes
  switch ($prise.Statut) {
    204 { exit 0 }
    200 { }
    429 { Ecrire "Plafond de recherches par 24 h atteint : rien de pris." -SiNouveau; exit 0 }
    401 { Ecrire "Clé de l'agent refusée par le site (AGENT_ACHETEURS_SECRET chez Hostinger ?)." -SiNouveau; exit 0 }
    404 { Ecrire "Le site n'a pas encore l'agent Acheteurs (mise en ligne à venir)." -SiNouveau; exit 0 }
    default { Ecrire "Le site n'a pas donné de recherche ($($prise.Statut))." -SiNouveau; exit 0 }
  }

  # Pas « $travail » : PowerShell ne distingue pas les majuscules, et $Travail est le dossier de travail.
  $recherche = $prise.Texte | ConvertFrom-Json
  $court = ([string]$recherche.id).Substring(0, 8)
  Ecrire "Recherche $court prise : Claude cherche."
  $resultatClaude = Chercher $config ([string]$recherche.demande)
  if (-not $resultatClaude.Echec -and $resultatClaude.Reponse.Length -gt 200000) {
    Ecrire "Réponse de Claude trop longue (plus de 200 000 caractères) : signalée comme échec."
    $resultatClaude = @{ Echec = "autre" }
  }

  $envoi = [ordered]@{ id = [string]$recherche.id; jeton = [string]$recherche.jeton }
  if ($resultatClaude.Echec) { $envoi.echec = $resultatClaude.Echec } else { $envoi.reponse = $resultatClaude.Reponse }
  $fichier = Join-Path $ARenvoyer "$($recherche.id).json"
  [IO.File]::WriteAllText($fichier, ($envoi | ConvertTo-Json -Compress -Depth 3), (New-Object System.Text.UTF8Encoding($false)))
  [void](Renvoyer $config $fichier)
}
catch {
  Ecrire "Erreur de l'agent : $($_.Exception.Message)" -SiNouveau
  exit 1
}
finally {
  $verrou.ReleaseMutex()
}
