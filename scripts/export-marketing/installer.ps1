<#
  Installe l'export du matin des agents marketing sur cet ordinateur :
    - copie export.mjs dans %USERPROFILE%\.technolot\export-marketing, pour que
      la tâche ne dépende pas de la branche ouverte dans le dossier du site ;
    - crée la tâche planifiée « Techno Lot - Export marketing » : du lundi au
      vendredi à 6 h 30, avant le passage de Léo à 7 h, sans fenêtre, seulement
      quand ce compte Windows est ouvert (heure manquée : au retour du PC).
  À relancer après chaque changement de export.mjs. Aucune clé ici : export.mjs
  lit .env.local dans le dossier du site. Retrait : desinstaller.ps1.
#>
param([string]$Site)

$ErrorActionPreference = "Stop"
$Ici = Split-Path -Parent $MyInvocation.MyCommand.Path
if (-not $Site) { $Site = (Resolve-Path (Join-Path $Ici "..\..")).Path }
# Pas dans AppData : l'app Claude (paquet MSIX) range ailleurs ce que ses fenêtres y écrivent,
# et la tâche planifiée ne le verrait pas.
$Base = Join-Path $env:USERPROFILE ".technolot\export-marketing"
$NomTache = "Techno Lot - Export marketing"

if (-not (Test-Path (Join-Path $Site ".env.local"))) { throw ".env.local absent de $Site" }
New-Item -ItemType Directory -Force $Base | Out-Null
Copy-Item -Force (Join-Path $Ici "export.mjs") (Join-Path $Base "export.mjs")

$node = (Get-Command node.exe -ErrorAction Stop).Source
$conhost = Join-Path $env:WINDIR "System32\conhost.exe"
$script = Join-Path $Base "export.mjs"
# conhost --headless : aucune fenêtre ne s'ouvre à 6 h 30. Le dossier de travail est celui du site.
$action = New-ScheduledTaskAction -Execute $conhost -WorkingDirectory $Site -Argument "--headless `"$node`" `"$script`""
$declencheur = New-ScheduledTaskTrigger -Weekly -DaysOfWeek Monday, Tuesday, Wednesday, Thursday, Friday -At ([datetime]::Today.AddHours(6).AddMinutes(30))
$reglages = New-ScheduledTaskSettingsSet -MultipleInstances IgnoreNew -ExecutionTimeLimit (New-TimeSpan -Minutes 10) `
  -StartWhenAvailable -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -Hidden
$compte = New-ScheduledTaskPrincipal -UserId ([Security.Principal.WindowsIdentity]::GetCurrent().Name) -LogonType Interactive -RunLevel Limited
Register-ScheduledTask -TaskName $NomTache -Action $action -Trigger $declencheur -Settings $reglages -Principal $compte `
  -Description "Chiffres du matin de Léo et Max, en lecture seule (scripts/export-marketing)." -Force | Out-Null

Write-Output "Export marketing installé dans $Base"
Write-Output "  Site : $Site"
Write-Output "  Tâche planifiée : « $NomTache », du lundi au vendredi à 6 h 30"
Write-Output "  Prochain passage : $((Get-ScheduledTaskInfo -TaskName $NomTache).NextRunTime)"
