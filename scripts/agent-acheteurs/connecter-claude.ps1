<#
  Connexion unique de Claude pour l'agent Acheteurs (forfait Claude de
  l'utilisateur ; guide : docs/AGENT-ACHETEURS.md). À ouvrir dans sa propre
  fenêtre : le navigateur s'ouvre, on se connecte à son compte Claude, et la
  connexion est gardée dans le dossier de l'agent seulement
  (%USERPROFILE%\.technolot\agent-acheteurs\claude), à part de l'app Claude.
#>
$ErrorActionPreference = "Stop"
$Base = Join-Path $env:USERPROFILE ".technolot\agent-acheteurs"
$ConfigClaude = Join-Path $Base "claude"
New-Item -ItemType Directory -Force $ConfigClaude | Out-Null

# Rien de l'environnement de l'app Claude : seulement le dossier de l'agent.
Get-ChildItem env: | Where-Object { $_.Name -match '^(CLAUDE|ANTHROPIC|MCP)' } | ForEach-Object { [Environment]::SetEnvironmentVariable($_.Name, $null, "Process") }
$env:CLAUDE_CONFIG_DIR = $ConfigClaude
$env:DISABLE_AUTOUPDATER = "1"

$installes = @(Get-ChildItem (Join-Path $env:LOCALAPPDATA "Claude-Data\*\claude-code\*\*\claude.exe") -ErrorAction SilentlyContinue)
$exe = if ($installes.Count -gt 0) { ($installes | Sort-Object LastWriteTime -Descending | Select-Object -First 1).FullName } else { (Get-Command claude.exe -ErrorAction SilentlyContinue).Source }

Write-Host ""
Write-Host "  Connexion de Claude pour l'agent Acheteurs de Techno Lot" -ForegroundColor Green
Write-Host ""
if (-not $exe) {
  Write-Host "  Claude Code est introuvable : installez l'app Claude, puis relancez." -ForegroundColor Yellow
  Read-Host "  Appuyez sur Entrée pour fermer"
  exit 1
}
Write-Host "  Votre navigateur va s'ouvrir : connectez-vous avec votre compte Claude"
Write-Host "  (forfait Max), acceptez, puis revenez dans cette fenêtre."
Write-Host "  Si un code est demandé ici, collez celui que le navigateur affiche."
Write-Host ""
& $exe auth login --claudeai
Write-Host ""
$statut = $null
try { $statut = (& $exe auth status 2>$null | Out-String) | ConvertFrom-Json } catch { }
if ($statut -and $statut.loggedIn) {
  Write-Host "  C'est fait : l'agent peut chercher avec votre forfait Claude." -ForegroundColor Green
} else {
  Write-Host "  La connexion n'a pas abouti. Fermez cette fenêtre et relancez la connexion." -ForegroundColor Yellow
}
Write-Host ""
Read-Host "  Appuyez sur Entrée pour fermer"
