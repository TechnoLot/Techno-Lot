<#
  Retire l'agent Acheteurs de cet ordinateur : la tâche planifiée, puis le
  dossier %USERPROFILE%\.technolot\agent-acheteurs (clé, connexion de Claude,
  journal). -GarderDossier : retire la tâche seulement. Les recherches en
  attente sur le site restent : elles partiront si l'agent est réinstallé.
#>
param([switch]$GarderDossier)

$ErrorActionPreference = "Stop"
$NomTache = "Techno Lot - Agent Acheteurs"
$Base = Join-Path $env:USERPROFILE ".technolot\agent-acheteurs"

if (Get-ScheduledTask -TaskName $NomTache -ErrorAction SilentlyContinue) {
  Unregister-ScheduledTask -TaskName $NomTache -Confirm:$false
  Write-Output "Tâche « $NomTache » retirée."
} else {
  Write-Output "Aucune tâche « $NomTache »."
}
if (-not $GarderDossier -and (Test-Path $Base)) {
  Remove-Item -Recurse -Force $Base
  Write-Output "Dossier $Base retiré."
}
