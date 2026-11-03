<#
  Installe l'agent Acheteurs de Techno Lot sur cet ordinateur (une fois ;
  guide : docs/AGENT-ACHETEURS.md) :
    - copie agent.ps1 dans %USERPROFILE%\.technolot\agent-acheteurs ;
    - crée la clé de l'agent (AGENT_ACHETEURS_SECRET), chiffrée pour ce compte
      Windows, jamais affichée (copier-cle.ps1 la met dans le presse-papiers
      pour Hostinger) ;
    - crée la tâche planifiée « Techno Lot - Agent Acheteurs » : toutes les
      5 minutes, sans fenêtre, seulement quand ce compte Windows est ouvert.
  Relancer l'installation met agent.ps1 à jour et garde la clé
  (-NouvelleCle pour en créer une autre : à recoller chez Hostinger).
#>
param(
  [string]$Site = "https://technolot.ca",
  [switch]$NouvelleCle,
  [switch]$SansTache
)

$ErrorActionPreference = "Stop"
$Ici = Split-Path -Parent $MyInvocation.MyCommand.Path
# Pas dans AppData : l'app Claude (paquet MSIX) range ailleurs ce que ses fenêtres y écrivent,
# et la tâche planifiée ne le verrait pas.
$Base = Join-Path $env:USERPROFILE ".technolot\agent-acheteurs"
$NomTache = "Techno Lot - Agent Acheteurs"

New-Item -ItemType Directory -Force $Base | Out-Null
Copy-Item -Force (Join-Path $Ici "agent.ps1") (Join-Path $Base "agent.ps1")

# Clé de l'agent : gardée si elle existe déjà.
$fichierConfig = Join-Path $Base "config.xml"
$ancienne = if (Test-Path $fichierConfig) { Import-Clixml $fichierConfig } else { $null }
if ($ancienne -and $ancienne.Cle -and -not $NouvelleCle) {
  $cle = $ancienne.Cle
  $etatCle = "gardée"
} else {
  $octets = New-Object byte[] 48
  $hasard = [Security.Cryptography.RandomNumberGenerator]::Create()
  $hasard.GetBytes($octets)
  $hasard.Dispose()
  $cle = ConvertTo-SecureString ([Convert]::ToBase64String($octets).TrimEnd("=").Replace("+", "-").Replace("/", "_")) -AsPlainText -Force
  [Array]::Clear($octets, 0, $octets.Length)
  $etatCle = "nouvelle (à coller chez Hostinger avec copier-cle.ps1)"
}
@{
  Site   = $Site.TrimEnd("/")
  Cle    = $cle
  Modele = if ($ancienne -and $ancienne.Modele) { $ancienne.Modele } else { "sonnet" }
  Effort = if ($ancienne -and $ancienne.Effort) { $ancienne.Effort } else { "medium" }
} | Export-Clixml -Path $fichierConfig

if (-not $SansTache) {
  $powershell = Join-Path $env:WINDIR "System32\WindowsPowerShell\v1.0\powershell.exe"
  $conhost = Join-Path $env:WINDIR "System32\conhost.exe"
  $agent = Join-Path $Base "agent.ps1"
  # conhost --headless : aucune fenêtre ne s'ouvre toutes les 5 minutes.
  $action = New-ScheduledTaskAction -Execute $conhost -WorkingDirectory $Base `
    -Argument "--headless `"$powershell`" -NoProfile -NonInteractive -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$agent`""
  $declencheur = New-ScheduledTaskTrigger -Once -At (Get-Date).AddMinutes(1) -RepetitionInterval (New-TimeSpan -Minutes 5)
  $reglages = New-ScheduledTaskSettingsSet -MultipleInstances IgnoreNew -ExecutionTimeLimit (New-TimeSpan -Minutes 30) `
    -StartWhenAvailable -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -Hidden
  $compte = New-ScheduledTaskPrincipal -UserId ([Security.Principal.WindowsIdentity]::GetCurrent().Name) -LogonType Interactive -RunLevel Limited
  Register-ScheduledTask -TaskName $NomTache -Action $action -Trigger $declencheur -Settings $reglages -Principal $compte `
    -Description "Recherche d'acheteurs de Techno Lot avec Claude (docs/AGENT-ACHETEURS.md)." -Force | Out-Null
}

# Claude Code : celui de l'app Claude (le plus récent), sinon celui du PATH.
$installes = @(Get-ChildItem (Join-Path $env:LOCALAPPDATA "Claude-Data\*\claude-code\*\*\claude.exe") -ErrorAction SilentlyContinue)
$exe = if ($installes.Count -gt 0) { ($installes | Sort-Object LastWriteTime -Descending | Select-Object -First 1).FullName } else { (Get-Command claude.exe -ErrorAction SilentlyContinue).Source }
$etatClaude = "introuvable : installez l'app Claude ou Claude Code"
if ($exe) {
  # Comme l'agent : rien de l'environnement de l'app Claude, seulement le dossier de l'agent.
  Get-ChildItem env: | Where-Object { $_.Name -match '^(CLAUDE|ANTHROPIC|MCP)' } | ForEach-Object { [Environment]::SetEnvironmentVariable($_.Name, $null, "Process") }
  $env:CLAUDE_CONFIG_DIR = Join-Path $Base "claude"
  try {
    $statut = (& $exe auth status 2>$null | Out-String) | ConvertFrom-Json
    $etatClaude = if ($statut.loggedIn) { "connecté ($($statut.authMethod))" } else { "pas encore connecté : lancez connecter-claude.ps1" }
  } catch { $etatClaude = "état illisible : lancez connecter-claude.ps1" }
}

Write-Output "Agent Acheteurs installé dans $Base"
Write-Output "  Site : $($Site.TrimEnd('/'))"
Write-Output "  Clé de l'agent : $etatCle"
Write-Output "  Tâche planifiée : $(if ($SansTache) { 'non créée (-SansTache)' } else { "« $NomTache », toutes les 5 minutes" })"
Write-Output "  Claude : $etatClaude"
