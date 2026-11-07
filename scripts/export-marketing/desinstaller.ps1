<#
  Retire l'export du matin de cet ordinateur : la tâche planifiée, puis le
  dossier %USERPROFILE%\.technolot\export-marketing (copie du script, journal).
  Les fichiers déjà écrits dans marketing/agents/donnees/ restent.
#>
$ErrorActionPreference = "Stop"
$NomTache = "Techno Lot - Export marketing"
$Base = Join-Path $env:USERPROFILE ".technolot\export-marketing"

if (Get-ScheduledTask -TaskName $NomTache -ErrorAction SilentlyContinue) {
  Unregister-ScheduledTask -TaskName $NomTache -Confirm:$false
  Write-Output "Tâche « $NomTache » retirée."
} else {
  Write-Output "Aucune tâche « $NomTache »."
}
if (Test-Path $Base) {
  Remove-Item -Recurse -Force $Base
  Write-Output "Dossier $Base retiré."
}
